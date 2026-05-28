// Haversine formula to calculate distance between two coordinates in kilometers
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Formats distance nicely (m or km)
export const formatDistance = (distanceInKm) => {
  if (distanceInKm < 1) {
    return `${(distanceInKm * 1000).toFixed(0)} m`;
  }
  return `${distanceInKm.toFixed(2)} km`;
};

// Calculate ETA to next checkpoint
export const calculateETA = (distanceInKm, speedInKmh) => {
  if (distanceInKm <= 0) return 'Reached';
  if (!speedInKmh || speedInKmh < 5) {
    // If stopped, assume a fallback speed of 30 km/h to calculate a hypothetical ETA
    const fallbackSpeed = 30;
    const timeInHours = distanceInKm / fallbackSpeed;
    const mins = Math.round(timeInHours * 60);
    return `${mins} mins (stopped)`;
  }

  const timeInHours = distanceInKm / speedInKmh;
  const totalMins = timeInHours * 60;

  if (totalMins < 1) {
    return 'Under a minute';
  }
  if (totalMins < 60) {
    return `${Math.round(totalMins)} mins`;
  }

  const hours = Math.floor(totalMins / 60);
  const mins = Math.round(totalMins % 60);
  return `${hours}h ${mins}m`;
};

// Generates a mock route (array of [lat, lng]) representing a beautiful ride
// (e.g. around San Francisco's Golden Gate and Marin Headlands, or central park)
// We will use Marin Headlands/Sausalito scenic loop!
export const MOCK_ROUTE_COORDINATES = [
  [37.7749, -122.4194], // San Francisco (Start)
  [37.7925, -122.4382], // Marina District
  [37.8086, -122.4744], // Presidio (Checkpoint 1)
  [37.8199, -122.4783], // Golden Gate Bridge Midpoint
  [37.8301, -122.4831], // Vista Point (Checkpoint 2)
  [37.8398, -122.4965], // Marin Headlands Ridge
  [37.8482, -122.4851], // Sausalito Scenic Road (Checkpoint 3)
  [37.8591, -122.4812], // Sausalito Marina (End)
];

export const MOCK_CHECKPOINTS = [
  { name: 'SF Presidio Gates', coords: { lat: 37.8086, lng: -122.4744 }, order: 1 },
  { name: 'GGB Vista Point', coords: { lat: 37.8301, lng: -122.4831 }, order: 2 },
  { name: 'Sausalito Scenic Road', coords: { lat: 37.8482, lng: -122.4851 }, order: 3 },
  { name: 'Sausalito Marina End', coords: { lat: 37.8591, lng: -122.4812 }, order: 4 },
];
