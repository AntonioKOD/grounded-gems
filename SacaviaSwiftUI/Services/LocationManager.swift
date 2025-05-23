import Foundation
import CoreLocation

class LocationManager: NSObject, ObservableObject {
    private let manager = CLLocationManager()
    
    @Published var location: CLLocation?
    @Published var error: Error?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 10 // Update location when user moves 10 meters
    }
    
    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }
    
    func startUpdatingLocation() {
        manager.startUpdatingLocation()
    }
    
    func stopUpdatingLocation() {
        manager.stopUpdatingLocation()
    }
}

extension LocationManager: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        // Only accept locations that are recent and accurate enough
        let howRecent = location.timestamp.timeIntervalSinceNow
        guard abs(howRecent) < 5,
              location.horizontalAccuracy < 100 else {
            return
        }
        
        self.location = location
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        self.error = error
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        case .denied, .restricted:
            // Handle denied access
            error = NSError(
                domain: "LocationManager",
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "Location access denied"]
            )
            stopUpdatingLocation()
        case .notDetermined:
            // Wait for user to grant permission
            break
        @unknown default:
            break
        }
    }
}

extension LocationManager {
    func getDistance(to coordinate: CLLocationCoordinate2D) -> CLLocationDistance? {
        guard let userLocation = location else { return nil }
        
        let destinationLocation = CLLocation(
            latitude: coordinate.latitude,
            longitude: coordinate.longitude
        )
        
        return userLocation.distance(from: destinationLocation)
    }
    
    func formatDistance(_ distance: CLLocationDistance) -> String {
        let kilometers = distance / 1000
        if kilometers < 1 {
            return String(format: "%.0fm", distance)
        } else {
            return String(format: "%.1fkm", kilometers)
        }
    }
    
    func isLocationServicesEnabled() -> Bool {
        return CLLocationManager.locationServicesEnabled()
    }
    
    func requestTemporaryFullAccuracyAuthorization(purposeKey: String) {
        if #available(iOS 14.0, *) {
            manager.requestTemporaryFullAccuracyAuthorization(
                withPurposeKey: purposeKey
            )
        }
    }
    
    func getCurrentPlacemark(completion: @escaping (CLPlacemark?) -> Void) {
        guard let location = location else {
            completion(nil)
            return
        }
        
        let geocoder = CLGeocoder()
        geocoder.reverseGeocodeLocation(location) { placemarks, error in
            guard error == nil,
                  let placemark = placemarks?.first else {
                completion(nil)
                return
            }
            completion(placemark)
        }
    }
    
    func getLocationName(completion: @escaping (String?) -> Void) {
        getCurrentPlacemark { placemark in
            guard let placemark = placemark else {
                completion(nil)
                return
            }
            
            var components: [String] = []
            
            if let city = placemark.locality {
                components.append(city)
            }
            if let state = placemark.administrativeArea {
                components.append(state)
            }
            if let country = placemark.country {
                components.append(country)
            }
            
            completion(components.joined(separator: ", "))
        }
    }
} 