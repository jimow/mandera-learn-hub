import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCenters } from "@/hooks/useCenters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Mandera County approximate center coordinates
const MANDERA_CENTER: [number, number] = [40.0, 3.9];
const INITIAL_ZOOM = 8;

export function CentersMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const { data: centers } = useCenters();

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapContainer.current || map.current) return;

      try {
        // Fetch Mapbox token from edge function
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        
        if (error || !data?.token) {
          setMapError("Mapbox token not configured");
          setTokenLoading(false);
          return;
        }

        mapboxgl.accessToken = data.token;
        setTokenLoading(false);

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: MANDERA_CENTER,
          zoom: INITIAL_ZOOM,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.current.on("load", () => {
          setMapLoaded(true);
        });

        map.current.on("error", (e) => {
          console.error("Map error:", e);
          setMapError("Failed to load map");
        });
      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError("Failed to initialize map");
        setTokenLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers when map is loaded and centers data is available
  useEffect(() => {
    if (!map.current || !mapLoaded || !centers) return;

    // Clear existing markers
    const markers = document.querySelectorAll(".mapboxgl-marker");
    markers.forEach((marker) => marker.remove());

    // Add markers for centers with coordinates
    centers.forEach((center) => {
      if (center.latitude && center.longitude) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold text-sm">${center.name}</h3>
            <p class="text-xs text-gray-600">${center.location}</p>
            <p class="text-xs text-gray-500">${center.sub_county}</p>
            <div class="mt-2 text-xs">
              <span class="text-primary font-medium">${center.students_count || 0}</span> students
            </div>
          </div>
        `);

        new mapboxgl.Marker({ color: "#16a34a" })
          .setLngLat([Number(center.longitude), Number(center.latitude)])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });
  }, [centers, mapLoaded]);

  const centersWithCoords = centers?.filter((c) => c.latitude && c.longitude).length || 0;
  const totalCenters = centers?.length || 0;

  if (tokenLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            ECDE Centers Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] rounded-lg bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
              <p>Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mapError) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            ECDE Centers Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] rounded-lg bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{mapError}</p>
              <p className="text-sm mt-1">Please configure your Mapbox token</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            ECDE Centers Map
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {centersWithCoords}/{totalCenters} centers mapped
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={mapContainer} className="h-[400px] rounded-lg overflow-hidden" />
      </CardContent>
    </Card>
  );
}