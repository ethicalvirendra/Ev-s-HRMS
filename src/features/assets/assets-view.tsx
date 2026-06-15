import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAssets, createAsset, assignAsset, returnAsset } from "@/lib/assets.functions";
import { listEmployees } from "@/lib/employees.functions";
import { toast } from "sonner";

export function AssetsView() {
  const qc = useQueryClient();
  const fetchAssets = useServerFn(listAssets);
  const fetchEmployees = useServerFn(listEmployees);

  const assets = useQuery({ queryKey: ["assets", "list"], queryFn: () => fetchAssets() });
  const employees = useQuery({ queryKey: ["employees", "list"], queryFn: () => fetchEmployees() });

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Add Asset form state
  const [name, setName] = useState("");
  const [type, setType] = useState("Laptop");
  const [serialNumber, setSerialNumber] = useState("");
  const [cost, setCost] = useState("");

  // Assign Asset form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Create mutation
  const createMut = useMutation({
    mutationFn: (data: { name: string; type: string; serial_number?: string; cost: number }) => createAsset(data),
    onSuccess: () => {
      toast.success("Asset added to inventory");
      setAddModalOpen(false);
      setName("");
      setSerialNumber("");
      setCost("");
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Assign mutation
  const assignMut = useMutation({
    mutationFn: (data: { assetId: string; employeeId: string }) => assignAsset(data),
    onSuccess: () => {
      toast.success("Asset checked out successfully");
      setAssignModalOpen(false);
      setSelectedAssetId(null);
      setSelectedEmployeeId("");
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Return mutation
  const returnMut = useMutation({
    mutationFn: (data: { assetId: string }) => returnAsset(data),
    onSuccess: () => {
      toast.success("Asset returned to inventory");
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numCost = parseFloat(cost);
    if (isNaN(numCost) || numCost < 0) {
      toast.error("Please enter a valid cost value");
      return;
    }
    createMut.mutate({
      name,
      type,
      serial_number: serialNumber || undefined,
      cost: numCost,
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }
    assignMut.mutate({
      assetId: selectedAssetId,
      employeeId: selectedEmployeeId,
    });
  };

  // Filtered assets list
  const filteredAssets = (assets.data || []).filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number && a.serial_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.employee?.full_name && a.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesType = typeFilter === "all" || a.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate Metrics
  const totalAssetsCount = assets.data?.length ?? 0;
  const assignedCount = assets.data?.filter((a) => a.status === "assigned").length ?? 0;
  const availableCount = assets.data?.filter((a) => a.status === "available").length ?? 0;
  const totalValue = assets.data?.reduce((sum, a) => sum + Number(a.cost || 0), 0) ?? 0;

  const getTypeIcon = (deviceType: string) => {
    switch (deviceType) {
      case "Laptop":
        return "laptop_mac";
      case "Mobile":
        return "smartphone";
      case "Monitor":
        return "monitor";
      case "Peripherals":
        return "keyboard";
      default:
        return "devices_other";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset & Device Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track company hardware, checkout devices to teams, and manage returns.</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">add_to_queue</span>
          Add Hardware
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Total Hardware</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalAssetsCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">inventory_2</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Deployed Assets</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{assignedCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">person_pin</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">In Stock (Available)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{availableCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">check_box</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Total Assets Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${totalValue.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">payments</span>
          </div>
        </div>
      </div>

      {/* Filtering Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs">
        <div className="flex w-full sm:w-auto items-center gap-2 border border-slate-300 rounded-lg bg-white px-3 py-2">
          <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search by asset name, serial # or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 focus:outline-none bg-transparent"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-4 justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="Laptop">Laptop</option>
              <option value="Mobile">Mobile</option>
              <option value="Monitor">Monitor</option>
              <option value="Peripherals">Peripherals</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                <th className="p-3.5">Device Model</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Serial Number</th>
                <th className="p-3.5">Cost</th>
                <th className="p-3.5">Assigned To</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 text-base">
                      {getTypeIcon(asset.type)}
                    </span>
                    {asset.name}
                  </td>
                  <td className="p-3.5 text-slate-500">{asset.type}</td>
                  <td className="p-3.5 font-mono text-slate-500">{asset.serial_number || "—"}</td>
                  <td className="p-3.5 font-semibold text-slate-900">${Number(asset.cost).toLocaleString()}</td>
                  <td className="p-3.5">
                    {asset.employee ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{asset.employee.full_name}</span>
                        <span className="text-[10px] text-slate-400">{asset.employee.employee_code}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">In Stock</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      asset.status === "available" ? "bg-emerald-100 text-emerald-800" :
                      asset.status === "assigned" ? "bg-blue-100 text-blue-800" :
                      asset.status === "maintenance" ? "bg-amber-100 text-amber-800" :
                      "bg-rose-100 text-rose-800"
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {asset.status === "available" ? (
                      <button
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setAssignModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                      >
                        Assign
                      </button>
                    ) : asset.status === "assigned" ? (
                      <button
                        onClick={() => returnMut.mutate({ assetId: asset.id })}
                        disabled={returnMut.isPending}
                        className="text-slate-500 hover:text-slate-800 font-bold hover:underline"
                      >
                        Return
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No hardware assets found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Hardware Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-base">library_add</span>
                Add New Hardware Asset
              </h2>
              <button onClick={() => setAddModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude 7440"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Device Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Mobile">Mobile Phone</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Peripherals">Peripherals</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Est. Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1200.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. CN-0XT481-..."
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                disabled={createMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createMut.isPending ? "Adding..." : "Add to Inventory"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Hardware Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-base">assignment_turned_in</span>
                Checkout Device
              </h2>
              <button onClick={() => { setAssignModalOpen(false); setSelectedAssetId(null); }} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Assign Device To:</label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.data && employees.data.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.job_title || "No Title"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[10px] text-blue-800 leading-relaxed">
                Checking out this device will change its status to <strong>Assigned</strong> and link it to the selected employee profile.
              </div>
              <button
                disabled={assignMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {assignMut.isPending ? "Checking out..." : "Checkout Asset"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
