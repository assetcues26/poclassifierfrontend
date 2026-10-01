/** Format any value for display; keep empty fields visible. */
export function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Friendly Title Case labels for UI only; raw keys unchanged in data/downloads. */
const FIELD_LABELS = {
  polinenumber: "PO line #",
  polineid: "PO line #",
  itemname: "Item name",
  description: "Description",
  quantity: "Quantity",
  unitprice: "Unit price",
  amount: "Amount",
  deliverydate: "Delivery date",
  orderdate: "Order date",
  polinestatus: "PO line status",
  postatus: "PO status",
  purchaseordernumber: "PO number",
  vendorname: "Vendor name",
  vendorcode: "Vendor code",
  locationcode: "Location code",
  companyname: "Company name",
  companycode: "Company code",
  totalamount: "Total amount",
  assetclass: "Asset class",
  assetclassid: "Asset class ID",
  category: "Category",
  categoryid: "Category ID",
  subcategory: "Subcategory",
  subcategoryid: "Subcategory ID",
  makemodel: "Make / model",
  makemodelid: "Make / model ID",
  model: "Model",
  modelid: "Model ID",
  status: "Status",
  requiresreview: "Requires review",
  groundingsource: "Grounding source",
  po_type: "PO type",
  po_type_id: "PO type ID",
  parent_polineid: "Parent PO line #",
  ai_assetname: "AI asset name",
  ai_description: "AI description",
  error_message: "Error message",
  confidencescore: "Confidence score",
};

export function fieldLabel(key) {
  if (key == null) return "";
  const k = String(key);
  if (FIELD_LABELS[k]) return FIELD_LABELS[k];
  return k
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusLabel(status) {
  const map = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    skipped: "Skipped",
    invalid: "Invalid",
  };
  return map[status] || status;
}

/** Header fields from ERP excluding lines. */
export function erpHeaderFields(erp) {
  if (!erp || typeof erp !== "object") return {};
  const { lines, ...rest } = erp;
  return rest;
}

/** Find matching Azure line for an ERP line. */
export function findAzureLine(azureResponse, polinenumber) {
  if (!azureResponse || !Array.isArray(azureResponse.lines)) return null;
  const want = Number(polinenumber);
  return (
    azureResponse.lines.find((l) => Number(l.polineid) === want) ||
    azureResponse.lines.find((l) => Number(l.polinenumber) === want) ||
    null
  );
}

/** Keys for AI columns: union of keys from azure lines, minus echoed input. */
export function aiFieldKeys(azureResponse) {
  const skip = new Set([
    "polineid",
    "polinenumber",
    "itemname",
    "description",
    "purchaseorderid",
  ]);
  const keys = new Set();
  const lines = azureResponse?.lines || [];
  for (const line of lines) {
    if (!line || typeof line !== "object") continue;
    Object.keys(line).forEach((k) => {
      if (!skip.has(k)) keys.add(k);
    });
  }
  return Array.from(keys);
}
