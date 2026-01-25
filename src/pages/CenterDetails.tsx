import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCenter } from "@/hooks/useCenters";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Users, 
  GraduationCap, 
  School,
  AlertCircle,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function CenterDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  const { data: center, isLoading: centerLoading } = useCenter(id || "");
  const { data: allStudents } = useStudents();
  const { data: allTeachers } = useTeachers();

  const students = allStudents?.filter(s => s.center_id === id) || [];
  const teachers = allTeachers?.filter(t => t.center_id === id) || [];

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
    if (!center?.latitude || !center?.longitude) return;

    let isMounted = true;

    const initializeMap = async () => {
      if (!mapContainer.current || map.current) return;

      try {
        const token = await fetchMapboxToken();
        if (!isMounted) return;

        mapboxgl.accessToken = token;
        setTokenLoading(false);

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [Number(center.longitude), Number(center.latitude)],
          zoom: 14,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.current.on("load", () => {
          if (isMounted) {
            setMapLoaded(true);
            
            // Add marker for this center
            const el = document.createElement("div");
            el.innerHTML = `
              <div style="
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 14px rgba(0,0,0,0.4);
                border: 3px solid white;
              ">
                <svg style="transform: rotate(45deg); width: 24px; height: 24px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
            `;

            new mapboxgl.Marker(el)
              .setLngLat([Number(center.longitude), Number(center.latitude)])
              .addTo(map.current!);
          }
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
  }, [center?.latitude, center?.longitude]);

  if (centerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20" />
          <p className="text-muted-foreground">Loading center details...</p>
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Center not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const occupancyRate = Math.round((students.length / (center.capacity || 50)) * 100);
  const pp1Students = students.filter(s => (s as any).class_level === "pp1").length;
  const pp2Students = students.filter(s => (s as any).class_level === "pp2").length;
  const maleStudents = students.filter(s => s.gender === "male").length;
  const femaleStudents = students.filter(s => s.gender === "female").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold text-lg">{center.name}</h1>
              <Badge variant={center.is_active ? "default" : "secondary"}>
                {center.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{center.code}</p>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 space-y-6">
        {/* Map Section */}
        {center.latitude && center.longitude ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-[300px] rounded-lg overflow-hidden">
                <div ref={mapContainer} className="absolute inset-0" />
                {(tokenLoading || mapError) && (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground px-6">
                      {mapError ? (
                        <>
                          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{mapError}</p>
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
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No coordinates available for this center</p>
            </CardContent>
          </Card>
        )}

        {/* Center Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="w-5 h-5 text-primary" />
                Center Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sub-County</p>
                  <p className="font-medium">{center.sub_county}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ward</p>
                  <p className="font-medium">{center.ward}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{center.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-medium">{center.capacity || 50} students</p>
                </div>
              </div>
              {center.established_date && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Established {format(new Date(center.established_date), "MMMM d, yyyy")}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {center.contact_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{center.contact_phone}</p>
                  </div>
                </div>
              )}
              {center.contact_email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{center.contact_email}</p>
                  </div>
                </div>
              )}
              {!center.contact_phone && !center.contact_email && (
                <p className="text-muted-foreground text-sm">No contact information available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl font-bold">{students.length}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-lg bg-secondary/10 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-3xl font-bold">{teachers.length}</p>
              <p className="text-sm text-muted-foreground">Teachers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <span className="text-xl font-bold text-accent">{center.capacity || 50}</span>
              </div>
              <p className="text-3xl font-bold">{occupancyRate}%</p>
              <p className="text-sm text-muted-foreground">Occupancy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-lg bg-info/10 flex items-center justify-center mb-3">
                <span className="text-xl font-bold text-info">
                  {teachers.length > 0 ? Math.round(students.length / teachers.length) : 0}
                </span>
              </div>
              <p className="text-3xl font-bold">:1</p>
              <p className="text-sm text-muted-foreground">Student:Teacher</p>
            </CardContent>
          </Card>
        </div>

        {/* Student Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{pp1Students}</p>
                  <p className="text-sm text-muted-foreground">PP1 Students</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pp2Students}</p>
                  <p className="text-sm text-muted-foreground">PP2 Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{maleStudents}</p>
                  <p className="text-sm text-muted-foreground">Male</p>
                </div>
                <div className="bg-pink-50 dark:bg-pink-950/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{femaleStudents}</p>
                  <p className="text-sm text-muted-foreground">Female</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teachers List */}
        {teachers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Teachers ({teachers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{teacher.full_name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.qualification || "Teacher"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
