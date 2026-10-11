import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { FormField } from "@/components/ui/form-field";
import { LoadingState, TableLoadingSkeleton } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { organizationSchema, validateSchema } from "@/lib/validations/common";
import {
  Sparkles,
  Layers,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Terminal,
} from "lucide-react";

export function ComponentShowcase() {
  const { addToast } = useToast();

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmLoading, setConfirmLoading] = React.useState(false);

  // Tabs state
  const [activeSubTab, setActiveSubTab] = React.useState("inputs");

  // Form demonstration with Zod validation
  const [formData, setFormData] = React.useState({
    name: "Apex International Academy",
    slug: "apex-international",
    code: "APEX",
    website: "https://apex.edu",
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string[]>>({});
  const [formSubmitted, setFormSubmitted] = React.useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateSchema(organizationSchema, formData);
    if (result.success) {
      setFormErrors({});
      setFormSubmitted(true);
      addToast({
        type: "success",
        title: "Validation Passed",
        description: "Organization form parsed and validated against Zod schema.",
      });
    } else {
      setFormErrors(result.fieldErrors);
      addToast({
        type: "error",
        title: "Validation Error",
        description: result.errorSummary,
      });
    }
  };

  const handleConfirmAction = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
      addToast({
        type: "info",
        title: "Confirmed",
        description: "Action executed through confirmation dialog modal.",
      });
    }, 800);
  };

  const subTabs = [
    { id: "inputs", label: "Inputs & Forms" },
    { id: "buttons", label: "Buttons & Badges" },
    { id: "overlays", label: "Dialogs & Overlays" },
    { id: "tables", label: "Tables & Lists" },
    { id: "feedback", label: "Feedback & States" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            UI Component Foundation Gallery
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            20 accessible, production-grade components adhering to Tailwind v4 and zero-pill discipline
          </p>
        </div>
        <Tabs
          tabs={subTabs}
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
          variant="segmented"
        />
      </div>

      {/* Subtab 1: Inputs & Forms */}
      {activeSubTab === "inputs" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Form with Zod Validation</CardTitle>
              <CardDescription>
                Demonstrates FormField, Input, Select, and error binding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <FormField
                  label="Organization Name"
                  required
                  error={formErrors.name}
                  description="Legal or registered name of the educational institution."
                >
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Oakridge Global Academy"
                    error={!!formErrors.name}
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    label="Slug (URL identifier)"
                    required
                    error={formErrors.slug}
                  >
                    <Input
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      placeholder="e.g. oakridge-global"
                      error={!!formErrors.slug}
                    />
                  </FormField>

                  <FormField
                    label="Institution Code"
                    error={formErrors.code}
                  >
                    <Input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. OGA"
                      maxLength={8}
                      error={!!formErrors.code}
                    />
                  </FormField>
                </div>

                <FormField
                  label="Official Website"
                  error={formErrors.website}
                >
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="https://..."
                    error={!!formErrors.website}
                  />
                </FormField>

                <div className="pt-2 flex items-center gap-3">
                  <Button type="submit">Validate with Zod</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        name: "A", // Invalid length
                        slug: "Invalid Slug!!", // Invalid characters
                        code: "TOOLONGCODE",
                        website: "invalid-url",
                      });
                    }}
                  >
                    Load Invalid Test Data
                  </Button>
                </div>

                {formSubmitted && Object.keys(formErrors).length === 0 && (
                  <Alert variant="success" title="Validation Succeeded">
                    Payload strictly conforms to OrganizationInput schema.
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controls: Select, Checkbox, Radio & Textarea</CardTitle>
              <CardDescription>
                Keyboard accessible form elements with accessible focus indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Campus Region Select">
                <Select
                  options={[
                    { label: "Northern Campus - Secondary Wing", value: "north" },
                    { label: "Southern Campus - Primary Wing", value: "south" },
                    { label: "West Campus - Administrative Hub", value: "west" },
                  ]}
                  defaultValue="north"
                />
              </FormField>

              <FormField label="Radio Selection Group">
                <RadioGroup
                  name="academic_cycle"
                  defaultValue="term"
                  options={[
                    {
                      label: "Standard Trimester System",
                      value: "term",
                      description: "Three 12-week academic terms per year.",
                    },
                    {
                      label: "Semester System",
                      value: "semester",
                      description: "Two 18-week academic semesters per year.",
                    },
                  ]}
                />
              </FormField>

              <div className="pt-2 space-y-2">
                <Checkbox
                  label="Enable Multi-Campus Single Sign-On"
                  description="Allow verified staff to switch campuses without re-authenticating."
                  defaultChecked
                />
                <Checkbox
                  label="Enforce strict multi-factor authentication for administrators"
                  description="Requires hardware key or authenticator app on all admin sessions."
                  defaultChecked
                />
              </div>

              <FormField label="Operational Notes / Textarea">
                <Textarea
                  placeholder="Enter initial institutional configuration notes or guidelines..."
                  rows={2}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subtab 2: Buttons & Badges */}
      {activeSubTab === "buttons" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Hierarchy & States</CardTitle>
              <CardDescription>
                Primary, secondary, outline, destructive, ghost, and loading variants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Action</Button>
                <Button variant="destructive">Destructive Action</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="link">Link Style</Button>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Sizes</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small (36px)</Button>
                  <Button size="default">Default (40px)</Button>
                  <Button size="lg">Large (44px)</Button>
                  <Button size="icon" title="Icon Only">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Interactive States</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button isLoading>Processing...</Button>
                  <Button disabled>Disabled State</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anti-Slop Badges & Status Markers</CardTitle>
              <CardDescription>
                Discreet, high-contrast, zero-pill metadata tags and status indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  System Status Tags (Square-radius, unboxed text)
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">Active Enrollment</Badge>
                  <Badge variant="warning">Awaiting Approval</Badge>
                  <Badge variant="destructive">Suspended</Badge>
                  <Badge variant="secondary">Draft Mode</Badge>
                  <Badge variant="outline">Archive</Badge>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Dot Status Indicators (Clean unboxed text with colored beacon)
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <Badge variant="dot" dotColor="bg-emerald-500">
                    Live Operational
                  </Badge>
                  <Badge variant="dot" dotColor="bg-amber-500">
                    Scheduled Maintenance
                  </Badge>
                  <Badge variant="dot" dotColor="bg-rose-500">
                    Connection Disrupted
                  </Badge>
                  <Badge variant="dot" dotColor="bg-slate-400">
                    Inactive
                  </Badge>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Metadata Separation Discipline (Typographic separators)
                </p>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Batch 2026-A</span>
                  <span aria-hidden="true">·</span>
                  <span>Primary Wing</span>
                  <span aria-hidden="true">·</span>
                  <span>Updated 5m ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subtab 3: Overlays */}
      {activeSubTab === "overlays" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dialogs & Modals</CardTitle>
              <CardDescription>
                Accessible dialogs with focus trap, backdrop blur, and escape key handling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-600">
                Test modal dialogues for general content display and sensitive action confirmation.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setDialogOpen(true)}>
                  Open Information Dialog
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  Open Confirmation Dialog
                </Button>
              </div>

              <Dialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title="System Architecture Specification"
                description="Technical reference for the School Management System foundation."
                footer={
                  <Button onClick={() => setDialogOpen(false)}>
                    Close Specification
                  </Button>
                }
              >
                <div className="space-y-3 text-xs leading-relaxed">
                  <p>
                    The system implements a clean monolith architecture structured into UI, Service,
                    Validation, and Repository layers.
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-700">
                    src/lib/db.ts → PrismaClient (PostgreSQL)
                    <br />
                    src/lib/api-response.ts → Standard Payload
                    <br />
                    src/lib/validations/ → Zod Schemas
                  </div>
                </div>
              </Dialog>

              <ConfirmationDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                destructive
                title="Confirm Institutional Reset"
                description="Are you sure you want to purge non-persistent cache entries? This test demonstrates the confirmation modal primitive."
                confirmLabel="Confirm Reset"
                isLoading={confirmLoading}
                onConfirm={handleConfirmAction}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dropdowns & Tooltips</CardTitle>
              <CardDescription>
                Contextual action menus and keyboard-navigable tooltips
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Action Dropdown Menu
                </p>
                <Dropdown
                  trigger={
                    <Button variant="outline" size="sm" className="gap-2">
                      <span>Actions Menu</span>
                      <MoreVertical className="h-4 w-4 text-slate-500" />
                    </Button>
                  }
                  items={[
                    {
                      label: "Edit Record",
                      icon: <Edit2 className="h-4 w-4" />,
                      onClick: () => addToast({ type: "info", title: "Edit Clicked" }),
                    },
                    {
                      label: "Audit History",
                      icon: <Terminal className="h-4 w-4" />,
                      onClick: () => addToast({ type: "info", title: "Audit Clicked" }),
                    },
                    { separator: true, label: "", onClick: () => {} },
                    {
                      label: "Delete Record",
                      icon: <Trash2 className="h-4 w-4" />,
                      destructive: true,
                      onClick: () => addToast({ type: "error", title: "Delete Triggered" }),
                    },
                  ]}
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Hover & Focus Tooltips
                </p>
                <div className="flex items-center gap-4">
                  <Tooltip content="PostgreSQL strict connection pool status" position="top">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                      <span>Hover Top</span>
                    </Button>
                  </Tooltip>

                  <Tooltip content="Zero-pill metadata discipline compliant" position="right">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                      <span>Hover Right</span>
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subtab 4: Tables */}
      {activeSubTab === "tables" && (
        <Card>
          <CardHeader>
            <CardTitle>Data Table Primitive (TanStack Ready)</CardTitle>
            <CardDescription>
              Accessible tabular rendering with subtle hover states, clean borders, and column alignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campus Code</TableHead>
                  <TableHead>Campus Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    CAMP-01
                  </TableCell>
                  <TableCell className="font-medium">Apex City Central Campus</TableCell>
                  <TableCell className="text-slate-500">London, United Kingdom</TableCell>
                  <TableCell>
                    <Badge variant="success">Operational</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addToast({ type: "info", title: "Selected CAMP-01" })}
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    CAMP-02
                  </TableCell>
                  <TableCell className="font-medium">Apex West Science Park</TableCell>
                  <TableCell className="text-slate-500">Bristol, United Kingdom</TableCell>
                  <TableCell>
                    <Badge variant="warning">Term Break</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addToast({ type: "info", title: "Selected CAMP-02" })}
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    CAMP-03
                  </TableCell>
                  <TableCell className="font-medium">Apex Academy Sports Annex</TableCell>
                  <TableCell className="text-slate-500">Bath, United Kingdom</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Commissioning</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addToast({ type: "info", title: "Selected CAMP-03" })}
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Subtab 5: Feedback & States */}
      {activeSubTab === "feedback" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts & Toast Triggers</CardTitle>
              <CardDescription>
                Consistent application alerts for info, success, warning, and error
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="info" title="System Notice">
                Phase 1 Technical Foundation is operational. All future modules will inherit these core primitives.
              </Alert>
              <Alert variant="success" title="Prisma Schema Compiled">
                Database client v6.19 generated with strict TypeScript types for all models.
              </Alert>
              <Alert variant="warning" title="Database Configuration Required">
                Configure DATABASE_URL to connect to your PostgreSQL instance.
              </Alert>
              <Alert variant="destructive" title="Security Boundary Alert">
                Unauthenticated requests to protected endpoints will be intercepted with 401 Unauthorized.
              </Alert>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    addToast({
                      type: "success",
                      title: "Success Toast",
                      description: "Operation finished cleanly without errors.",
                    })
                  }
                >
                  Trigger Success Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    addToast({
                      type: "warning",
                      title: "Warning Toast",
                      description: "Attention required: resource quota nearing limit.",
                    })
                  }
                >
                  Trigger Warning Toast
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    addToast({
                      type: "error",
                      title: "Error Toast",
                      description: "Failed to communicate with external gateway.",
                    })
                  }
                >
                  Trigger Error Toast
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Loading State</CardTitle>
              </CardHeader>
              <CardContent>
                <LoadingState message="Loading student records..." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Empty State</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="No Academic Terms"
                  description="No academic calendars have been configured for this campus yet."
                  actionLabel="Create Term (Phase 4)"
                  onAction={() => addToast({ type: "info", title: "Phase 4 Action" })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error State</CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorState
                  title="Connection Timeout"
                  message="Failed to retrieve database metadata."
                  code="ERR_DB_TIMEOUT"
                  onRetry={() => addToast({ type: "info", title: "Retrying..." })}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Table Loading Skeleton</CardTitle>
              <CardDescription>
                Prevents layout shifts while tabular data streams into the client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TableLoadingSkeleton rows={3} columns={4} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
