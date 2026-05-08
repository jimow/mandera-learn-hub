import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Key,
  Copy,
  Trash2,
  Plus,
  Code,
  Book,
  Shield,
  AlertCircle,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey, useActivateApiKey } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const endpoints = [
  {
    name: "Teachers",
    path: "/teachers",
    methods: [
      {
        method: "GET",
        description: "List all teachers or get a specific teacher",
        params: [
          { name: "id", type: "string", required: false, description: "Teacher ID to fetch specific teacher" },
          { name: "center_id", type: "string", required: false, description: "Filter by center ID" },
        ],
        example: {
          request: `curl -X GET "${API_BASE_URL}/teachers" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
          response: `{
  "data": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "employee_number": "EMP001",
      "gender": "male",
      "phone": "+254712345678",
      "email": "john@example.com",
      "qualification": "Diploma in Education",
      "center_id": "uuid",
      "center_name": "ABC ECDE Center",
      "is_active": true
    }
  ]
}`,
        },
      },
      {
        method: "POST",
        description: "Create a new teacher",
        params: [
          { name: "full_name", type: "string", required: true, description: "Teacher's full name" },
          { name: "employee_number", type: "string", required: true, description: "Employee number" },
          { name: "national_id", type: "string", required: true, description: "National ID" },
          { name: "gender", type: "string", required: true, description: "Gender (male/female)" },
          { name: "center_id", type: "string", required: false, description: "Assigned center ID" },
          { name: "phone", type: "string", required: false, description: "Phone number" },
          { name: "email", type: "string", required: false, description: "Email address" },
          { name: "qualification", type: "string", required: false, description: "Qualification" },
        ],
        example: {
          request: `curl -X POST "${API_BASE_URL}/teachers" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "full_name": "Jane Smith",
    "employee_number": "EMP002",
    "national_id": "12345678",
    "gender": "female",
    "phone": "+254712345679"
  }'`,
          response: `{
  "data": {
    "id": "uuid",
    "full_name": "Jane Smith",
    ...
  }
}`,
        },
      },
      {
        method: "PUT",
        description: "Update an existing teacher",
        params: [
          { name: "id", type: "string", required: true, description: "Teacher ID (query param)" },
        ],
        example: {
          request: `curl -X PUT "${API_BASE_URL}/teachers?id=uuid" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"phone": "+254712345680"}'`,
          response: `{
  "data": {
    "id": "uuid",
    "phone": "+254712345680",
    ...
  }
}`,
        },
      },
      {
        method: "DELETE",
        description: "Delete a teacher",
        params: [
          { name: "id", type: "string", required: true, description: "Teacher ID (query param)" },
        ],
        example: {
          request: `curl -X DELETE "${API_BASE_URL}/teachers?id=uuid" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
          response: `{
  "message": "Teacher deleted successfully"
}`,
        },
      },
    ],
  },
  {
    name: "Students",
    path: "/students",
    methods: [
      {
        method: "GET",
        description: "List all students or get a specific student",
        params: [
          { name: "id", type: "string", required: false, description: "Student ID to fetch specific student" },
          { name: "center_id", type: "string", required: false, description: "Filter by center ID" },
          { name: "status", type: "string", required: false, description: "Filter by approval status" },
        ],
        example: {
          request: `curl -X GET "${API_BASE_URL}/students?center_id=uuid" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
          response: `{
  "data": [
    {
      "id": "uuid",
      "full_name": "Alice Johnson",
      "admission_number": "ADM001",
      "gender": "female",
      "date_of_birth": "2019-05-15",
      "class_level": "pp1",
      "parent_name": "Mary Johnson",
      "parent_phone": "+254712345678",
      "center_id": "uuid",
      "center_name": "ABC ECDE Center",
      "approval_status": "approved"
    }
  ]
}`,
        },
      },
      {
        method: "POST",
        description: "Create a new student",
        params: [
          { name: "full_name", type: "string", required: true, description: "Student's full name" },
          { name: "admission_number", type: "string", required: true, description: "Admission number" },
          { name: "gender", type: "string", required: true, description: "Gender (male/female)" },
          { name: "date_of_birth", type: "string", required: true, description: "Date of birth (YYYY-MM-DD)" },
          { name: "parent_name", type: "string", required: true, description: "Parent/guardian name" },
          { name: "parent_phone", type: "string", required: true, description: "Parent phone number" },
          { name: "center_id", type: "string", required: false, description: "Center ID" },
          { name: "class_level", type: "string", required: false, description: "Class level (pp1/pp2)" },
        ],
        example: {
          request: `curl -X POST "${API_BASE_URL}/students" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "full_name": "Bob Smith",
    "admission_number": "ADM002",
    "gender": "male",
    "date_of_birth": "2019-08-20",
    "parent_name": "John Smith",
    "parent_phone": "+254712345678",
    "center_id": "uuid"
  }'`,
          response: `{
  "data": {
    "id": "uuid",
    "full_name": "Bob Smith",
    ...
  }
}`,
        },
      },
      {
        method: "PUT",
        description: "Update an existing student",
        params: [
          { name: "id", type: "string", required: true, description: "Student ID (query param)" },
        ],
        example: {
          request: `curl -X PUT "${API_BASE_URL}/students?id=uuid" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"class_level": "pp2"}'`,
          response: `{
  "data": {
    "id": "uuid",
    "class_level": "pp2",
    ...
  }
}`,
        },
      },
      {
        method: "DELETE",
        description: "Delete a student",
        params: [
          { name: "id", type: "string", required: true, description: "Student ID (query param)" },
        ],
        example: {
          request: `curl -X DELETE "${API_BASE_URL}/students?id=uuid" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
          response: `{
  "message": "Student deleted successfully"
}`,
        },
      },
    ],
  },
  {
    name: "Centers",
    path: "/centers",
    methods: [
      {
        method: "GET",
        description: "List all ECDE centers or get a specific center",
        params: [
          { name: "id", type: "string", required: false, description: "Center ID to fetch specific center" },
          { name: "sub_county", type: "string", required: false, description: "Filter by sub-county" },
          { name: "ward", type: "string", required: false, description: "Filter by ward" },
        ],
        example: {
          request: `curl -X GET "${API_BASE_URL}/centers" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
          response: `{
  "data": [
    {
      "id": "uuid",
      "name": "ABC ECDE Center",
      "code": "CTR001",
      "location": "Mandera Town",
      "sub_county": "Mandera East",
      "ward": "Township",
      "capacity": 100,
      "students_count": 45,
      "teachers_count": 3,
      "is_active": true
    }
  ]
}`,
        },
      },
      {
        method: "POST",
        description: "Create a new ECDE center",
        params: [
          { name: "name", type: "string", required: true, description: "Center name" },
          { name: "code", type: "string", required: true, description: "Center code" },
          { name: "location", type: "string", required: true, description: "Location" },
          { name: "sub_county", type: "string", required: true, description: "Sub-county" },
          { name: "ward", type: "string", required: true, description: "Ward" },
          { name: "capacity", type: "number", required: false, description: "Student capacity" },
          { name: "latitude", type: "number", required: false, description: "GPS latitude" },
          { name: "longitude", type: "number", required: false, description: "GPS longitude" },
        ],
        example: {
          request: `curl -X POST "${API_BASE_URL}/centers" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "New ECDE Center",
    "code": "CTR002",
    "location": "Mandera West",
    "sub_county": "Mandera West",
    "ward": "Dandu",
    "capacity": 80
  }'`,
          response: `{
  "data": {
    "id": "uuid",
    "name": "New ECDE Center",
    ...
  }
}`,
        },
      },
      {
        method: "PUT",
        description: "Update an existing center",
        params: [
          { name: "id", type: "string", required: true, description: "Center ID (query param)" },
        ],
        example: {
          request: `curl -X PUT "${API_BASE_URL}/centers?id=uuid" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"capacity": 120}'`,
          response: `{
  "data": {
    "id": "uuid",
    "capacity": 120,
    ...
  }
}`,
        },
      },
      {
        method: "DELETE",
        description: "Delete a center",
        params: [
          { name: "id", type: "string", required: true, description: "Center ID (query param)" },
        ],
        example: {
          request: `curl -X DELETE "${API_BASE_URL}/centers?id=uuid" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
          response: `{
  "message": "Center deleted successfully"
}`,
        },
      },
    ],
  },
];

function CreateKeyDialog({ onCreated }: { onCreated: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["read"]);
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const createApiKey = useCreateApiKey();

  const handleCreate = async () => {
    let expiresAt: string | null = null;
    if (expiresIn !== "never") {
      const days = parseInt(expiresIn);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    const result = await createApiKey.mutateAsync({
      name,
      permissions,
      expires_at: expiresAt,
    });

    onCreated(result.key);
    setOpen(false);
    setName("");
    setPermissions(["read"]);
    setExpiresIn("never");
  };

  const togglePermission = (perm: string) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter((p) => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Generate API Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate New API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for accessing the ECDE API endpoints.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Key Name</Label>
            <Input
              id="name"
              placeholder="e.g., Production API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="flex flex-wrap gap-4">
              {["read", "create", "update", "delete"].map((perm) => (
                <div key={perm} className="flex items-center space-x-2">
                  <Checkbox
                    id={perm}
                    checked={permissions.includes(perm)}
                    onCheckedChange={() => togglePermission(perm)}
                  />
                  <Label htmlFor={perm} className="capitalize">
                    {perm}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expires">Expires In</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name || permissions.length === 0 || createApiKey.isPending}
          >
            Generate Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${colors[method]}`}>
      {method}
    </span>
  );
}

export default function ApiDocumentation() {
  const { isSuperAdmin } = useAuth();
  const { data: apiKeys, isLoading } = useApiKeys();
  const revokeApiKey = useRevokeApiKey();
  const deleteApiKey = useDeleteApiKey();
  const activateApiKey = useActivateApiKey();
  const { toast } = useToast();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isSuperAdmin()) {
    return <Navigate to="/" replace />;
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "API key copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          API Documentation
        </h1>
        <p className="text-muted-foreground mt-1">
          RESTful API endpoints for managing ECDE data programmatically
        </p>
      </div>

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <Book className="w-4 h-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6">
          {/* New Key Alert */}
          {newKey && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-foreground">
                      API Key Generated Successfully
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Make sure to copy your API key now. You won't be able to see it again!
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 p-2 bg-background rounded border font-mono text-sm break-all">
                        {newKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(newKey)}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setNewKey(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Keys Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access to the ECDE API
                </CardDescription>
              </div>
              <CreateKeyDialog onCreated={setNewKey} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading API keys...
                </div>
              ) : !apiKeys?.length ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No API keys generated yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate your first API key to start using the API
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {key.key_prefix}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {key.permissions.map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="destructive">Revoked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(key.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.expires_at
                            ? format(new Date(key.expires_at), "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {key.is_active ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revokeApiKey.mutate(key.id)}
                              >
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => activateApiKey.mutate(key.id)}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteApiKey.mutate(key.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                All API requests require authentication using a Bearer token. Include your API key
                in the Authorization header:
              </p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
              </pre>
              <div className="flex items-start gap-2 p-4 bg-accent rounded-lg border border-border">
                <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm text-accent-foreground">
                  <p className="font-medium">Keep your API keys secure</p>
                  <p className="mt-1">
                    Never share your API keys in public repositories or client-side code.
                    Regenerate keys immediately if you suspect they've been compromised.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Base URL */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Base URL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{API_BASE_URL}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Endpoints */}
          {endpoints.map((endpoint) => (
            <Card key={endpoint.path}>
              <CardHeader>
                <CardTitle>{endpoint.name}</CardTitle>
                <CardDescription>
                  <code className="text-primary">{endpoint.path}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {endpoint.methods.map((method, idx) => (
                  <div key={idx} className="space-y-4 pb-6 border-b last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <MethodBadge method={method.method} />
                      <span className="text-sm text-muted-foreground">
                        {method.description}
                      </span>
                    </div>

                    {method.params.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Parameters</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Required</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {method.params.map((param) => (
                              <TableRow key={param.name}>
                                <TableCell>
                                  <code className="text-xs">{param.name}</code>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {param.type}
                                </TableCell>
                                <TableCell>
                                  {param.required ? (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      Optional
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {param.description}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Example Request</h4>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <code className="text-xs">{method.example.request}</code>
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Example Response</h4>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <code className="text-xs">{method.example.response}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
