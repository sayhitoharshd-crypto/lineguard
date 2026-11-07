import { useState } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [place, setPlace] = useState(null); // { name, address, lat, lng }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function detect() {
    setBusy(true); setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Allow it in Settings or type the place below.');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      let name = `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
      let address = name;
      try {
        const [p] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (p) {
          name = [p.name, p.street].filter(Boolean).join(', ') || p.district || p.city || name;
          address = [p.name, p.street, p.district || p.subregion, p.city, p.region, p.country].filter(Boolean).join(', ') || name;
        }
      } catch (e) {}
      const res = { name, address, lat, lng };
      setPlace(res);
      return res;
    } catch (e) {
      setError('Could not get GPS. Make sure Location is ON in your phone, or type the place.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { place, setPlace, busy, error, detect };
}
