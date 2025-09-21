import { getPayload } from "payload";
import config from '@payload-config';
import haversine from "haversine-distance";

export interface UserPreferences {
  interests: string[];
  primaryUseCase: string;
  travelRadius: string;
  budgetPreference: string;
  location?: {
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface PersonalizedLocation {
  id: string;
  name: string;
  description?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  categories: string[];
  priceRange: string;
  rating?: number;
  distance?: number;
  personalizedScore: number;
  matchReasons: string[];
  featuredImage?: string;
  businessHours?: any[];
  isOpen?: boolean;
  ownership?: {
    claimStatus?: 'unclaimed' | 'pending' | 'approved' | 'rejected';
    ownerId?: string;
    claimedAt?: string;
    claimEmail?: string;
  };
}

export class LocationPersonalizationService {
  private payload: any;

  constructor() {
    this.initPayload();
  }

  private async initPayload() {
    this.payload = await getPayload({ config });
  }

  /**
   * Get personalized location recommendations based on user preferences
   */
  async getPersonalizedLocations(
    userId: string, 
    limit = 20, 
    offset = 0
  ): Promise<PersonalizedLocation[]> {
    if (!this.payload) {
      await this.initPayload();
    }

    try {
      // Get user preferences from onboarding data
      const userPreferences = await this.getUserPreferences(userId);
      if (!userPreferences) {
        // Fallback to general recommendations if no preferences
        return await this.getGeneralRecommendations(limit, offset);
      }

      // Get locations based on user's travel radius and interests
      const locations = await this.fetchRelevantLocations(userPreferences);

      // Score and rank locations based on user preferences
      const scoredLocations = await this.scoreLocations(locations, userPreferences);

      // Apply pagination
      return scoredLocations.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting personalized locations:', error);
      return [];
    }
  }

  /**
   * Get user preferences from their onboarding data
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId,
        depth: 1,
      });

      if (!user || !user.onboardingData) {
        return null;
      }

      return {
        interests: user.interests || [],
        primaryUseCase: user.onboardingData.primaryUseCase,
        travelRadius: user.onboardingData.travelRadius || '5',
        budgetPreference: user.onboardingData.budgetPreference,
        location: user.location,
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  }

  /**
   * Fetch locations relevant to user preferences
   */
  private async fetchRelevantLocations(preferences: UserPreferences): Promise<any[]> {
    const query: any = {
      status: { equals: 'published' },
    };

    // Filter by user interests if they have any
    if (preferences.interests && preferences.interests.length > 0) {
      query.categories = {
        in: this.mapInterestsToCategories(preferences.interests),
      };
    }

    // Filter by budget preference
    if (preferences.budgetPreference) {
      query.priceRange = this.getBudgetRangeFilter(preferences.budgetPreference);
    }

    const { docs } = await this.payload.find({
      collection: 'locations',
      where: query,
      limit: 100, // Get more for better scoring
      depth: 2,
    });

    return docs;
  }

  /**
   * Score locations based on user preferences using Zipf's Law principles
   */
  private async scoreLocations(
    locations: any[], 
    preferences: UserPreferences
  ): Promise<PersonalizedLocation[]> {
    const userCoords = preferences.location?.coordinates;
    const maxDistance = this.getMaxDistanceKm(preferences.travelRadius);

    const scoredLocations = locations.map((location) => {
      let score = 0;
      const matchReasons: string[] = [];

      // Base score from popularity (Zipf's Law - popular places get higher base score)
      const popularityMetrics = this.calculatePopularityScore(location);
      score += popularityMetrics.score * 0.3; // 30% weight for popularity

      // Interest matching score (40% weight - most important)
      const interestScore = this.calculateInterestScore(location, preferences.interests);
      score += interestScore.score * 0.4;
      matchReasons.push(...interestScore.reasons);

      // Distance score (15% weight)
      let distance = 0;
      if (userCoords && location.coordinates) {
        distance = haversine(
          { latitude: userCoords.latitude, longitude: userCoords.longitude },
          { latitude: location.coordinates.latitude, longitude: location.coordinates.longitude }
        ) / 1000; // Convert to km

        if (distance <= maxDistance) {
          const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
          score += distanceScore * 0.15;
          
          if (distance < 1) matchReasons.push('Very close to you');
          else if (distance < 3) matchReasons.push('Nearby location');
        } else {
          // Location is outside travel radius, significantly reduce score
          score *= 0.3;
        }
      }

      // Budget preference score (10% weight)
      const budgetScore = this.calculateBudgetScore(location, preferences.budgetPreference);
      score += budgetScore.score * 0.1;
      if (budgetScore.reason) matchReasons.push(budgetScore.reason);

      // Time preference score (5% weight) - defaulted since we simplified
      const timeScore = 50; // Neutral score for all locations
      score += timeScore * 0.05;

      // Primary use case bonus
      const useCaseBonus = this.calculateUseCaseBonus(location, preferences.primaryUseCase);
      score += useCaseBonus.score;
      if (useCaseBonus.reason) matchReasons.push(useCaseBonus.reason);

      return {
        id: location.id,
        name: location.name,
        description: location.description,
        coordinates: location.coordinates,
        categories: location.categories || [],
        priceRange: location.priceRange || 'moderate',
        rating: location.averageRating,
        distance,
        personalizedScore: score,
        matchReasons,
        featuredImage: location.featuredImage?.url,
        businessHours: location.businessHours,
        isOpen: this.isLocationOpen(location.businessHours),
        ownership: location.ownership,
      };
    });

    // Sort by personalized score (highest first) and filter out very low scores
    return scoredLocations
      .filter(location => location.personalizedScore > 20) // Minimum threshold
      .sort((a, b) => b.personalizedScore - a.personalizedScore);
  }

  /**
   * Calculate popularity score based on engagement metrics
   */
  private calculatePopularityScore(location: any): { score: number } {
    let score = 0;

    // Engagement metrics
    const likes = location.likeCount || 0;
    const reviews = location.reviewCount || 0;
    const saves = location.saveCount || 0;
    const visits = location.visitCount || 0;

    // Zipf's Law weighting - most popular actions get higher weight
    score += likes * 1.0;
    score += reviews * 3.0; // Reviews are more valuable
    score += saves * 2.0;
    score += visits * 0.5;

    // Verification and featured bonuses
    if (location.isVerified) score += 20;
    if (location.isFeatured) score += 30;

    return { score: Math.min(score, 100) }; // Cap at 100
  }

  /**
   * Calculate how well location matches user interests
   */
  private calculateInterestScore(location: any, userInterests: string[]): { score: number; reasons: string[] } {
    if (!userInterests || userInterests.length === 0) {
      return { score: 50, reasons: [] }; // Neutral score
    }

    const locationCategories = location.categories?.map((cat: any) => 
      typeof cat === 'string' ? cat : cat.name || cat.label
    ) || [];

    const matchingInterests: string[] = [];
    let score = 0;

    userInterests.forEach((interest) => {
      const categoryMatches = this.mapInterestToCategory(interest);
      const hasMatch = locationCategories.some((cat: string) => 
        categoryMatches.includes(cat.toLowerCase())
      );

      if (hasMatch) {
        score += 100 / userInterests.length; // Equal weight per interest
        matchingInterests.push(this.getInterestDisplayName(interest));
      }
    });

    const reasons = matchingInterests.length > 0 
      ? [`Matches your interests: ${matchingInterests.join(', ')}`]
      : [];

    return { score, reasons };
  }

  /**
   * Calculate budget compatibility score
   */
  private calculateBudgetScore(location: any, budgetPref?: string): { score: number; reason?: string } {
    if (!budgetPref || !location.priceRange) {
      return { score: 50 }; // Neutral score
    }

    const budgetOrder = ['free', 'budget', 'moderate', 'premium', 'luxury'];
    const userBudgetIndex = budgetOrder.indexOf(budgetPref);
    const locationBudgetIndex = budgetOrder.indexOf(location.priceRange);

    if (userBudgetIndex === -1 || locationBudgetIndex === -1) {
      return { score: 50 };
    }

    // Perfect match
    if (userBudgetIndex === locationBudgetIndex) {
      return { 
        score: 100, 
        reason: `Matches your ${budgetPref} budget preference` 
      };
    }

    // Within one level is still good
    if (Math.abs(userBudgetIndex - locationBudgetIndex) === 1) {
      return { score: 70 };
    }

    // Too expensive or too cheap
    return { score: 20 };
  }



  /**
   * Calculate bonus score based on primary use case
   */
  private calculateUseCaseBonus(location: any, primaryUseCase?: string): { score: number; reason?: string } {
    if (!primaryUseCase) return { score: 0 };

    switch (primaryUseCase) {
      case 'explore':
        // Favor unique, hidden gems
        if (location.isHiddenGem || location.uniqueFeatures) {
          return { score: 15, reason: 'Perfect for exploration' };
        }
        break;
      case 'plan':
        // Favor places with good planning info (hours, contact, etc.)
        if (location.businessHours && location.contactInfo) {
          return { score: 10, reason: 'Good for planning outings' };
        }
        break;
      case 'share':
        // Favor photogenic places
        if (location.featuredImage || location.isInstagrammable) {
          return { score: 12, reason: 'Great for sharing' };
        }
        break;
      case 'connect':
        // Favor social venues
        if (location.categories?.some((cat: any) => 
          ['bar', 'cafe', 'restaurant', 'event venue'].includes(
            (typeof cat === 'string' ? cat : cat.name || '').toLowerCase()
          )
        )) {
          return { score: 10, reason: 'Perfect for meeting people' };
        }
        break;
    }

    return { score: 0 };
  }

  /**
   * Helper methods
   */
  private mapInterestsToCategories(interests: string[]): string[] {
    const mapping: { [key: string]: string[] } = {
      coffee: ['cafe', 'coffee shop', 'bakery'],
      restaurants: ['restaurant', 'dining', 'food'],
      nature: ['park', 'garden', 'nature', 'outdoor'],
      photography: ['scenic', 'viewpoint', 'landmark', 'art'],
      nightlife: ['bar', 'club', 'nightlife', 'entertainment'],
      shopping: ['shop', 'market', 'retail', 'boutique'],
      arts: ['museum', 'gallery', 'theater', 'cultural'],
      sports: ['sports', 'recreation', 'fitness', 'gym'],
      markets: ['market', 'farmer market', 'local business'],
      events: ['event venue', 'concert hall', 'entertainment'],
    };

    return interests.flatMap(interest => mapping[interest] || []);
  }

  private mapInterestToCategory(interest: string): string[] {
    const mapping: { [key: string]: string[] } = {
      coffee: ['cafe', 'coffee shop', 'bakery'],
      restaurants: ['restaurant', 'dining', 'food'],
      nature: ['park', 'garden', 'nature', 'outdoor'],
      photography: ['scenic', 'viewpoint', 'landmark', 'art'],
      nightlife: ['bar', 'club', 'nightlife', 'entertainment'],
      shopping: ['shop', 'market', 'retail', 'boutique'],
    };

    return mapping[interest] || [];
  }

  private getInterestDisplayName(interest: string): string {
    const mapping: { [key: string]: string } = {
      coffee: 'Coffee & Cafes',
      restaurants: 'Restaurants',
      nature: 'Nature & Parks',
      photography: 'Photo Spots',
      nightlife: 'Nightlife',
      shopping: 'Shopping',
    };

    return mapping[interest] || interest;
  }

  private getBudgetRangeFilter(budgetPref: string): any {
    switch (budgetPref) {
      case 'free':
        return { equals: 'free' };
      case 'budget':
        return { in: ['free', 'budget'] };
      case 'moderate':
        return { in: ['budget', 'moderate'] };
      case 'premium':
        return { in: ['moderate', 'premium'] };
      case 'luxury':
        return { in: ['premium', 'luxury'] };
      default:
        return undefined; // No filter
    }
  }

  private getMaxDistanceKm(travelRadius: string): number {
    const mapping: { [key: string]: number } = {
      '0.5': 0.8, // Walking distance
      '2': 3,     // Nearby
      '5': 8,     // Local area
      '15': 25,   // Extended area
      'unlimited': 100, // Anywhere
    };

    return mapping[travelRadius] || 8; // Default to 5 miles
  }

  private isLocationOpen(businessHours?: any[]): boolean {
    if (!businessHours || businessHours.length === 0) return true;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const todayHours = businessHours.find(hours => hours.day === currentDay);
    if (!todayHours || todayHours.closed) return false;

    if (todayHours.open && todayHours.close) {
      return currentTime >= todayHours.open && currentTime <= todayHours.close;
    }

    return true;
  }

  /**
   * Fallback for users without preferences
   */
  private async getGeneralRecommendations(limit: number, offset: number): Promise<PersonalizedLocation[]> {
    const { docs } = await this.payload.find({
      collection: 'locations',
      where: {
        status: { equals: 'published' },
      },
      sort: '-createdAt',
      limit,
      page: Math.floor(offset / limit) + 1,
      depth: 1,
    });

    return docs.map((location: any) => ({
      id: location.id,
      name: location.name,
      description: location.description,
      coordinates: location.coordinates,
      categories: location.categories || [],
      priceRange: location.priceRange || 'moderate',
      rating: location.averageRating,
      distance: 0,
      personalizedScore: 50,
      matchReasons: ['Popular location'],
      featuredImage: location.featuredImage?.url,
      businessHours: location.businessHours,
      isOpen: this.isLocationOpen(location.businessHours),
      ownership: location.ownership,
    }));
  }

  /**
   * Get locations filtered by specific criteria for the explorer page
   */
  async getFilteredLocations(
    userId: string,
    filters: {
      category?: string;
      priceRange?: string;
      radius?: number;
      isOpen?: boolean;
      rating?: number;
    },
    limit = 20,
    offset = 0
  ): Promise<PersonalizedLocation[]> {
    if (!this.payload) {
      await this.initPayload();
    }

    try {
      const userPreferences = await this.getUserPreferences(userId);
      
      // Build query based on filters
      const query: any = {
        status: { equals: 'published' },
      };

      if (filters.category && filters.category !== 'all') {
        query.categories = { contains: filters.category };
      }

      if (filters.priceRange) {
        query.priceRange = { equals: filters.priceRange };
      }

      if (filters.rating) {
        query.averageRating = { greater_than_equal: filters.rating };
      }

      const { docs } = await this.payload.find({
        collection: 'locations',
        where: query,
        limit: limit * 2, // Get more for filtering
        depth: 2,
      });

      // Apply user preferences scoring even with filters
      let locations = docs;
      if (userPreferences) {
        locations = await this.scoreLocations(docs, userPreferences);
      } else {
        locations = docs.map((location: any) => ({
          id: location.id,
          name: location.name,
          description: location.description,
          coordinates: location.coordinates,
          categories: location.categories || [],
          priceRange: location.priceRange || 'moderate',
          rating: location.averageRating,
          distance: 0,
          personalizedScore: 50,
          matchReasons: [],
          featuredImage: location.featuredImage?.url,
          businessHours: location.businessHours,
          isOpen: this.isLocationOpen(location.businessHours),
          ownership: location.ownership,
        }));
      }

      // Apply additional filters
      let filteredLocations = locations;

      if (filters.isOpen !== undefined) {
        filteredLocations = filteredLocations.filter((loc: { isOpen: any; }) => 
          filters.isOpen ? loc.isOpen : true
        );
      }

      if (filters.radius && userPreferences?.location?.coordinates) {
        filteredLocations = filteredLocations.filter((loc: { distance: number; }) => 
          loc.distance ? loc.distance <= filters.radius! : true
        );
      }

      return filteredLocations.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting filtered locations:', error);
      return [];
    }
  }
}

// Export singleton instance
export const locationPersonalizationService = new LocationPersonalizationService(); 