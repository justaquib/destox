export const WEATHER_ENABLED_KEY = "destox.weather.enabled";

type IpLocation = {
  city?: string;
  region?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
};

export async function getLocalWeather(): Promise<string> {
  const locationResponse = await fetch("https://ipapi.co/json/");
  if (!locationResponse.ok) throw new Error("Could not determine approximate location");
  const location = (await locationResponse.json()) as IpLocation;
  if (typeof location.latitude !== "number" || typeof location.longitude !== "number") {
    throw new Error("Could not determine approximate location");
  }

  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature&temperature_unit=celsius`,
  );
  if (!weatherResponse.ok) throw new Error("Could not load local weather");
  const weather = await weatherResponse.json();
  const place = [location.city, location.region, location.country_name]
    .filter(Boolean)
    .join(", ");
  const temperature = Math.round(weather.current.temperature_2m);
  const feelsLike = Math.round(weather.current.apparent_temperature);

  return `${place || "Approximate location"} · ${temperature}°C · feels like ${feelsLike}°`;
}
