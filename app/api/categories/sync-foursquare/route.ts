import { NextRequest, NextResponse } from 'next/server'
import { getFoursquareAPI } from '@/lib/foursquare'
import configPromise from '@/payload.config'
import { getPayload } from 'payload'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const foursquareAPI = getFoursquareAPI()

    if (!foursquareAPI) {
      return NextResponse.json(
        { error: 'Foursquare API not configured' },
        { status: 500 }
      )
    }

    console.log('Starting Foursquare categories sync...')

    // Fetch categories from Foursquare
    const categoriesResponse = await foursquareAPI.getCategoriesHierarchical()
    
    if (!categoriesResponse.mainCategories || categoriesResponse.mainCategories.length === 0) {
      return NextResponse.json(
        { error: 'No categories found from Foursquare' },
        { status: 404 }
      )
    }

    const syncResults = {
      created: 0,
      updated: 0,
      errors: []
    }

    // Process main categories first
    for (const mainCategory of categoriesResponse.mainCategories) {
      try {
        // Check if category already exists
        const existingCategory = await payload.find({
          collection: 'categories',
          where: {
            foursquareId: {
              equals: mainCategory.id
            }
          }
        })

        const categoryData = {
          name: mainCategory.name,
          slug: mainCategory.name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-'),
          type: 'location' as const,
          source: 'foursquare' as const,
          foursquareId: mainCategory.id,
          foursquarePluralName: mainCategory.pluralName,
          foursquareShortName: mainCategory.shortName,
          foursquareIcon: {
            prefix: mainCategory.icon.prefix,
            suffix: mainCategory.icon.suffix
          },
          description: mainCategory.pluralName || mainCategory.name,
          isActive: true,
          showInFilter: true,
          lastSyncDate: new Date()
        }

        if (existingCategory.docs.length > 0) {
          // Update existing category
          await payload.update({
            collection: 'categories',
            id: existingCategory.docs[0].id,
            data: categoryData
          })
          syncResults.updated++
        } else {
          // Create new category
          await payload.create({
            collection: 'categories',
            data: categoryData
          })
          syncResults.created++
        }

        // Process subcategories
        for (const subcategory of mainCategory.subcategories) {
          try {
            // Check if subcategory already exists
            const existingSubcategory = await payload.find({
              collection: 'categories',
              where: {
                foursquareId: {
                  equals: subcategory.id
                }
              }
            })

            // Find the parent category we just created/updated
            const parentCategory = await payload.find({
              collection: 'categories',
              where: {
                foursquareId: {
                  equals: mainCategory.id
                }
              }
            })

            const subcategoryData = {
              name: subcategory.name,
              slug: subcategory.name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-'),
              type: 'location' as const,
              source: 'foursquare' as const,
              foursquareId: subcategory.id,
              foursquarePluralName: subcategory.pluralName,
              foursquareShortName: subcategory.shortName,
              foursquareIcon: {
                prefix: subcategory.icon.prefix,
                suffix: subcategory.icon.suffix
              },
              description: subcategory.pluralName || subcategory.name,
              parent: parentCategory.docs.length > 0 ? parentCategory.docs[0].id : undefined,
              isActive: true,
              showInFilter: true,
              lastSyncDate: new Date()
            }

            if (existingSubcategory.docs.length > 0) {
              // Update existing subcategory
              await payload.update({
                collection: 'categories',
                id: existingSubcategory.docs[0].id,
                data: subcategoryData
              })
              syncResults.updated++
            } else {
              // Create new subcategory
              await payload.create({
                collection: 'categories',
                data: subcategoryData
              })
              syncResults.created++
            }
          } catch (subcategoryError) {
            console.error(`Error processing subcategory ${subcategory.name}:`, subcategoryError)
            syncResults.errors.push(`Subcategory ${subcategory.name}: ${subcategoryError}`)
          }
        }
      } catch (categoryError) {
        console.error(`Error processing category ${mainCategory.name}:`, categoryError)
        syncResults.errors.push(`Category ${mainCategory.name}: ${categoryError}`)
      }
    }

    console.log('Foursquare categories sync completed:', syncResults)

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${syncResults.created} created, ${syncResults.updated} updated`,
      results: syncResults
    })

  } catch (error) {
    console.error('Error syncing Foursquare categories:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to sync Foursquare categories',
    endpoint: '/api/categories/sync-foursquare',
    method: 'POST'
  })
} 