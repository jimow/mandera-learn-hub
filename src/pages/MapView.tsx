import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCenters } from "@/hooks/useCenters";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MANDERA_CENTER: [number, number] = [40.0, 3.9];
const INITIAL_ZOOM = 8;

export default function MapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const { data: centers } = useCenters();

  // Get center coordinates from URL params if available
  const centerLng = searchParams.get("lng");
  const centerLat = searchParams.get("lat");
  const zoomLevel = searchParams.get("zoom");

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
      if (!mapContainer.current || map.current) return;

      try {
        const token = await fetchMapboxToken();
        if (!isMounted) return;

        mapboxgl.accessToken = token;
        setTokenLoading(false);

        const initialCenter: [number, number] = centerLng && centerLat 
          ? [parseFloat(centerLng), parseFloat(centerLat)]
          : MANDERA_CENTER;
        
        const initialZoom = zoomLevel ? parseFloat(zoomLevel) : INITIAL_ZOOM;

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: initialCenter,
          zoom: initialZoom,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

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

    let attempts = 0;
    const maxAttempts = 40;
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
  }, [centerLng, centerLat, zoomLevel]);

  // Add markers when map is loaded and centers data is available
  useEffect(() => {
    if (!map.current || !mapLoaded || !centers) return;

    const markers = document.querySelectorAll(".mapboxgl-marker");
    markers.forEach((marker) => marker.remove());

    centers.forEach((center) => {
      if (center.latitude && center.longitude) {
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
                <span>${center.location || "N/A"}</span>
              </div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                <div style="text-align: center;">
                  <div style="font-weight: 600; color: #16a34a; font-size: 16px;">${(center as any).students_count || 0}</div>
                  <div style="color: #9ca3af; font-size: 10px;">Students</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-weight: 600; color: #2563eb; font-size: 16px;">${(center as any).teachers_count || 0}</div>
                  <div style="color: #9ca3af; font-size: 10px;">Teachers</div>
                </div>
              </div>
            </div>
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([Number(center.longitude), Number(center.latitude)])
          .addTo(map.current!);

        el.addEventListener("mouseenter", () => {
          popup.setLngLat([Number(center.longitude), Number(center.latitude)]).addTo(map.current!);
        });
        el.addEventListener("mouseleave", () => {
          popup.remove();
        });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          navigate(`/centers/${center.id}`);
        });
      }
    });
  }, [centers, mapLoaded, navigate]);

  const centersWithCoords = centers?.filter((c) => c.latitude && c.longitude).length || 0;
  const totalCenters = centers?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-semibold text-lg">ECDE Centers Map</h1>
              <p className="text-sm text-muted-foreground">
                {centersWithCoords}/{totalCenters} centers mapped
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click on a pin to view center details</span>
          </div>
        </div>
      </div>

      <div className="relative h-[calc(100vh-4rem)]">
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
    </div>
  );
}
