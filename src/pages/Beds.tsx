import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, BedDouble } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Bed = Tables<"beds">;
type BedStatus = Database["public"]["Enums"]["bed_status"];

const statusStyles: Record<BedStatus, string> = {
  available: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
  occupied: "bg-primary/15 text-primary border-primary/30",
  maintenance: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
};

export default function Beds() {
  const { role } = useAuth();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ bed_number: "", ward: "General" });
  const canManage = role === "admin" || role === "receptionist";

  const fetchBeds = async () => {
    const { data } = await supabase.from("beds").select("*").order("bed_number");
    if (data) setBeds(data);
  };

  useEffect(() => { fetchBeds(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("beds").insert({ bed_number: form.bed_number, ward: form.ward });
    if (error) { toast.error(error.message); return; }
    toast.success("Bed added");
    setDialogOpen(false);
    setForm({ bed_number: "", ward: "General" });
    fetchBeds();
  };

  const updateStatus = async (id: string, status: BedStatus) => {
    const { error } = await supabase.from("beds").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchBeds();
  };

  return (
    <AppLayout title="Bed Management">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {beds.filter((b) => b.status === "available").length} of {beds.length} beds available
          </p>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Add Bed</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Bed</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bed Number *</Label>
                    <Input value={form.bed_number} onChange={(e) => setForm({ ...form, bed_number: e.target.value })} required placeholder="e.g. A-101" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ward</Label>
                    <Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full">Add Bed</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {beds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BedDouble className="w-10 h-10 mb-2" />
              <p>No beds configured</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {beds.map((bed) => (
              <Card key={bed.id} className="text-center">
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm">{bed.bed_number}</p>
                  <p className="text-xs text-muted-foreground">{bed.ward}</p>
                  <Badge variant="outline" className={statusStyles[bed.status]}>{bed.status}</Badge>
                  {canManage && (
                    <Select value={bed.status} onValueChange={(v) => updateStatus(bed.id, v as BedStatus)}>
                      <SelectTrigger className="h-7 text-xs mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
