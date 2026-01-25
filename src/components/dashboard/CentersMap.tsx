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

  const fetchMapboxToken = async (): Promise<string> => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) throw new Error("Backend URL not configured");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${baseUrl}/functions/v1/get-mapbox-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        signal: controller.signal,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const token = typeof json?.token === "string" ? json.token : null;
      if (!token) throw new Error("Token missing in response");
      return token;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      // NOTE: On some renders, the effect can fire before the ref is attached.
      // If we return early here and never retry, the UI stays stuck on "Loading map...".
      if (!mapContainer.current || map.current) return;

      try {
        const token = await fetchMapboxToken();
        if (!isMounted) return;

        mapboxgl.accessToken = token;
        setTokenLoading(false);

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: MANDERA_CENTER,
          zoom: INITIAL_ZOOM,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.current.on("load", () => {
          if (isMounted) setMapLoaded(true);
        });

        map.current.on("error", (e) => {
          console.error("Map error:", e);
          if (isMounted) setMapError("Failed to load map");
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to initialize map";
        console.error("Map initialization error:", error);
        if (isMounted) {
          setMapError(msg);
          setTokenLoading(false);
        }
      }
    };

    // Retry briefly until the ref is attached (prevents "Loading map..." from getting stuck)
    let attempts = 0;
    const maxAttempts = 40; // ~4s at 100ms
    const intervalId = window.setInterval(() => {
      if (!isMounted) return;
      attempts += 1;
      if (mapContainer.current && !map.current) {
        window.clearInterval(intervalId);
        void initializeMap();
        return;
      }
      if (attempts >= maxAttempts) {
        window.clearInterval(intervalId);
        setMapError("Map container not ready");
        setTokenLoading(false);
      }
    }, 100);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Create custom school marker element
        const el = document.createElement("div");
        el.className = "school-marker";
        el.innerHTML = `
          <div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
            cursor: pointer;
          ">
            <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        `;

        // Create popup for hover
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
          className: "school-popup",
        }).setHTML(`
          <div style="padding: 12px; min-width: 180px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 32px; height: 32px; background: #16a34a; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <svg style="width: 18px; height: 18px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3 style="font-weight: 600; font-size: 14px; color: #1f2937; margin: 0;">${center.name}</h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px;">
              <div style="display: flex; align-items: center; gap: 6px; color: #6b7280;">
                <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>${center.location || "N/A"}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; color: #6b7280;">
                <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>${center.sub_county || "N/A"}</span>
              </div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                <div style="text-align: center;">
                  <div style="font-weight: 600; color: #16a34a; font-size: 16px;">${center.students_count || 0}</div>
                  <div style="color: #9ca3af; font-size: 10px;">Students</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-weight: 600; color: #2563eb; font-size: 16px;">${center.teachers_count || 0}</div>
                  <div style="color: #9ca3af; font-size: 10px;">Teachers</div>
                </div>
              </div>
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([Number(center.longitude), Number(center.latitude)])
          .addTo(map.current!);

        // Show popup on hover
        el.addEventListener("mouseenter", () => {
          popup.setLngLat([Number(center.longitude), Number(center.latitude)]).addTo(map.current!);
        });
        el.addEventListener("mouseleave", () => {
          popup.remove();
        });
      }
    });
  }, [centers, mapLoaded]);

  const centersWithCoords = centers?.filter((c) => c.latitude && c.longitude).length || 0;
  const totalCenters = centers?.length || 0;

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
        <div className="relative h-[400px] rounded-lg overflow-hidden">
          <div ref={mapContainer} className="absolute inset-0" />

          {(tokenLoading || mapError) && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground px-6">
                {mapError ? (
                  <>
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{mapError}</p>
                    <p className="text-sm mt-1">Please configure your Mapbox token</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
                    <p>Loading map...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}