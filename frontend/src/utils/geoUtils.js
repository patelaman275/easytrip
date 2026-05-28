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

// Real Chennai Route: Kattankulathur (SRM) to Mahindra World City via NH-45 (GST Road)
export const MOCK_ROUTE_COORDINATES = [
  [12.8230, 80.0440], // Kattankulathur (SRM University Start)
  [12.8222, 80.0381], // Potheri Junction
  [12.8105, 80.0315], // Maraimalai Nagar Spot
  [12.8015, 80.0245], // Thailavaram
  [12.7930, 80.0160], // Singaperumal Koil
  [12.7550, 80.0090], // Paranur GST Road Tollgate
  [12.7380, 80.0050], // Mahindra World City Lake Canopy (End Destination)
];

export const MOCK_CHECKPOINTS = [
  { name: 'SRM University Gate', coords: { lat: 12.8230, lng: 80.0440 }, order: 1 },
  { name: 'Maraimalai Nagar Spot', coords: { lat: 12.8105, lng: 80.0315 }, order: 2 },
  { name: 'Paranur Tollgate', coords: { lat: 12.7550, lng: 80.0090 }, order: 3 },
  { name: 'Mahindra World City Canopy', coords: { lat: 12.7380, lng: 80.0050 }, order: 4 },
];
