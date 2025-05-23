import SwiftUI
import MapboxMaps

// Constants to avoid naming conflicts with Mapbox's MapView
private enum Constants {
    static let mapboxToken = "pk.eyJ1IjoiYW50b25pby1rb2RoZWxpIiwiYSI6ImNtYTQ3OHR0NjA0YWgyaXB3bmk4azRic2wifQ.0dwpXPvpOiiqqWb9XaJuTg"
}

struct LocationMapView: View {
    @StateObject private var viewModel = MapViewModel()
    @EnvironmentObject var locationManager: LocationManager
    @State private var selectedLocation: Location?
    @State private var showingLocationSheet = false
    @State private var showingFilters = false
    @State private var camera = CameraOptions(
        center: CLLocationCoordinate2D(latitude: 0, longitude: 0),
        zoom: 14
    )
    
    var body: some View {
        NavigationView {
            ZStack {
                MapboxMapView(
                    camera: $camera,
                    locations: viewModel.locations,
                    onLocationTap: { location in
                        selectedLocation = location
                        showingLocationSheet = true
                    }
                )
                .ignoresSafeArea(edges: .bottom)
                
                VStack {
                    // Search Bar
                    SearchBar(text: $viewModel.searchQuery)
                        .padding()
                        .background(Color(.systemBackground))
                    
                    Spacer()
                    
                    // Category Filter Pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(viewModel.categories, id: \.name) { category in
                                CategoryPill(
                                    category: category,
                                    isSelected: viewModel.selectedCategory?.id == category.id
                                ) {
                                    viewModel.selectedCategory = category
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 8)
                    .background(Color(.systemBackground))
                }
            }
            .navigationTitle("Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingFilters = true }) {
                        Image(systemName: "slider.horizontal.3")
                    }
                }
                
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: centerOnUserLocation) {
                        Image(systemName: "location")
                    }
                }
            }
            .sheet(isPresented: $showingLocationSheet) {
                if let location = selectedLocation {
                    LocationDetailSheet(location: location)
                }
            }
            .sheet(isPresented: $showingFilters) {
                FilterSheet(filters: viewModel.filters) { newFilters in
                    Task {
                        await viewModel.applyFilters(newFilters)
                    }
                }
            }
            .onAppear {
                centerOnUserLocation()
                Task {
                    await viewModel.fetchLocations()
                    await viewModel.fetchCategories()
                }
            }
            .onChange(of: locationManager.location) { _ in
                centerOnUserLocation()
            }
            .onChange(of: viewModel.searchQuery) { _ in
                Task {
                    await viewModel.searchLocations()
                }
            }
        }
    }
    
    private func centerOnUserLocation() {
        if let location = locationManager.location {
            camera = CameraOptions(
                center: location.coordinate,
                zoom: 14
            )
        }
    }
}

struct MapboxMapView: UIViewControllerRepresentable {
    @Binding var camera: CameraOptions
    let locations: [Location]
    let onLocationTap: (Location) -> Void
    
    func makeUIViewController(context: Context) -> MapboxViewController {
        let viewController = MapboxViewController(
            camera: camera,
            locations: locations,
            onLocationTap: onLocationTap
        )
        context.coordinator.parent = viewController
        return viewController
    }
    
    func updateUIViewController(_ viewController: MapboxViewController, context: Context) {
        viewController.updateCamera(camera)
        viewController.updateLocations(locations)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject {
        var parent: MapboxViewController?
        private let view: MapboxMapView
        
        init(_ view: MapboxMapView) {
            self.view = view
        }
    }
}

class MapboxViewController: UIViewController {
    var mapView: MapboxMaps.MapView!
    var camera: CameraOptions
    var locations: [Location]
    let onLocationTap: (Location) -> Void
    private var pointAnnotationManager: PointAnnotationManager?
    
    init(camera: CameraOptions, locations: [Location], onLocationTap: @escaping (Location) -> Void) {
        self.camera = camera
        self.locations = locations
        self.onLocationTap = onLocationTap
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Set the access token first
        MapboxOptions.accessToken = Constants.mapboxToken
        
        // Create map view with the token already set
        mapView = MapboxMaps.MapView(frame: view.bounds)
        
        // Set camera and style
        mapView.mapboxMap.setCamera(to: camera)
        mapView.mapboxMap.loadStyleURI(StyleURI.streets)
        
        mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(mapView)
        
        // Create annotation manager
        pointAnnotationManager = mapView.annotations.makePointAnnotationManager()
        
        // Add location markers
        addLocationMarkers()
        
        // Add tap gesture recognizer
        let gestureRecognizer = UITapGestureRecognizer(target: self, action: #selector(handleMapTap(_:)))
        mapView.addGestureRecognizer(gestureRecognizer)
    }
    
    func updateCamera(_ newCamera: CameraOptions) {
        mapView.camera.ease(
            to: newCamera,
            duration: 0.5
        )
    }
    
    func updateLocations(_ newLocations: [Location]) {
        self.locations = newLocations
        addLocationMarkers()
    }
    
    private func addLocationMarkers() {
        guard let pointAnnotationManager = pointAnnotationManager else { return }
        
        // Remove existing annotations
        pointAnnotationManager.annotations = []
        
        // Add new annotations
        var pointAnnotations: [PointAnnotation] = []
        
        for location in locations {
            // Create a PointAnnotation using coordinate constructor
            var pointAnnotation = PointAnnotation(coordinate: CLLocationCoordinate2D(
                latitude: location.coordinates.latitude,
                longitude: location.coordinates.longitude
            ))
            
            // Customize the annotation
            if let image = UIImage(systemName: "mappin.circle.fill") {
                pointAnnotation.image = .init(
                    image: image,
                    name: "custom-marker"
                )
                pointAnnotation.iconAnchor = .bottom
                
                // Store location ID in userInfo
                pointAnnotation.userInfo = ["locationId": location.id]
                
                // Add tap handler to the annotation
                pointAnnotation.tapHandler = { [weak self] _ in
                    if let self = self,
                       let location = self.locations.first(where: { $0.id == location.id }) {
                        self.onLocationTap(location)
                        return true
                    }
                    return false
                }
                
                pointAnnotations.append(pointAnnotation)
            }
        }
        
        // Add annotations to the manager
        pointAnnotationManager.annotations = pointAnnotations
    }
    
    @objc private func handleMapTap(_ gesture: UITapGestureRecognizer) {
        // Note: We don't need this method anymore since we've added tap handlers to each annotation
        // However, keeping it for potential background map taps if needed
        
        let point = gesture.location(in: mapView)
        
        // Convert to map coordinates
        let mapPoint = mapView.mapboxMap.coordinate(for: point)
        
        // We're now using the annotation tap handlers instead of manual hit testing
        // This method is left as a placeholder for other map interaction
    }
}

struct CategoryPill: View {
    let category: Category
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                if let icon = category.icon {
                    AsyncImage(url: URL(string: icon.url ?? "")) { phase in
                        switch phase {
                        case .empty, .failure:
                            Image(systemName: "mappin")
                                .foregroundColor(isSelected ? .white : .blue)
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 16, height: 16)
                        @unknown default:
                            EmptyView()
                        }
                    }
                }
                
                Text(category.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color.blue.opacity(0.1))
            .foregroundColor(isSelected ? .white : .blue)
            .cornerRadius(20)
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)
            
            TextField("Search locations...", text: $text)
                .textFieldStyle(PlainTextFieldStyle())
            
            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

struct FilterSheet: View {
    let filters: MapViewModel.MapFilters
    let onApply: (MapViewModel.MapFilters) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var currentFilters: MapViewModel.MapFilters
    
    init(filters: MapViewModel.MapFilters, onApply: @escaping (MapViewModel.MapFilters) -> Void) {
        self.filters = filters
        self.onApply = onApply
        _currentFilters = State(initialValue: filters)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Distance")) {
                    Slider(
                        value: $currentFilters.radius,
                        in: 1...50,
                        step: 1
                    ) {
                        Text("Radius")
                    } minimumValueLabel: {
                        Text("1km")
                    } maximumValueLabel: {
                        Text("50km")
                    }
                }
                
                Section(header: Text("Filters")) {
                    Toggle("Open Now", isOn: $currentFilters.openNow)
                    Toggle("Verified Only", isOn: $currentFilters.verifiedOnly)
                }
                
                Section(header: Text("Sort By")) {
                    Picker("Sort", selection: $currentFilters.sortBy) {
                        Text("Distance").tag("distance")
                        Text("Rating").tag("rating")
                        Text("Popularity").tag("popularity")
                    }
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Apply") {
                        onApply(currentFilters)
                        dismiss()
                    }
                }
            }
        }
    }
}

class MapViewModel: ObservableObject {
    @Published var locations: [Location] = []
    @Published var categories: [Category] = []
    @Published var selectedCategory: Category?
    @Published var searchQuery = ""
    @Published var filters = MapFilters()
    @Published var error: Error?
    
    private let apiService = APIService.shared
    private var searchTask: Task<Void, Never>?
    
    struct MapFilters {
        var radius: Double = 25
        var openNow = false
        var verifiedOnly = false
        var sortBy = "distance"
    }
    
    func fetchLocations() async {
        do {
            var queryParams: [String: Any] = [
                "sort": filters.sortBy
            ]
            
            if filters.openNow {
                queryParams["openNow"] = true
            }
            
            if filters.verifiedOnly {
                queryParams["verified"] = true
            }
            
            if let category = selectedCategory {
                queryParams["category"] = category.id
            }
            
            locations = try await apiService.getLocations(filters: queryParams)
        } catch {
            await MainActor.run {
                self.error = error
            }
        }
    }
    
    func fetchCategories() async {
        do {
            categories = try await apiService.getCategories(type: "location")
        } catch {
            await MainActor.run {
                self.error = error
            }
        }
    }
    
    func searchLocations() async {
        // Cancel any existing search task
        searchTask?.cancel()
        
        guard !searchQuery.isEmpty else {
            await fetchLocations()
            return
        }
        
        // Create a new search task
        searchTask = Task {
            do {
                let results = try await apiService.searchLocations(query: searchQuery)
                await MainActor.run {
                    self.locations = results
                }
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func applyFilters(_ newFilters: MapFilters) async {
        await MainActor.run {
            filters = newFilters
        }
        await fetchLocations()
    }
}

#Preview {
    LocationMapView()
        .environmentObject(LocationManager())
} 