import React, { useState } from 'react';
import { Package, Tag, Settings, Handshake, CheckCircle, ChevronRight, Pencil, X, Check } from 'lucide-react';
import type { Item, Role } from '../../types';
import StatusBadge from '../shared/StatusBadge';
import { formatDate, formatDateInput } from '../../utils/dateHelpers';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';

interface ItemLifecycleRowProps {
  item: Item;
  userRole: Role;
  onUpdate: () => void;
  orderType?: string;
}

const CAN_EDIT_ITEM: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT'];
const CAN_RECEIVE: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE'];
const CAN_ASSET_TAG: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'ASSET'];
const CAN_IT_CONFIG: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'IT'];
const CAN_HANDOVER: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE'];
const CAN_CLEARANCE: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'FINANCE'];

interface DateCellProps {
  label: string;
  value?: string | null;
  editable?: boolean;
  onSave?: (date: string) => Promise<void>;
  highlight?: 'green' | 'red' | 'none';
}

const DateCell: React.FC<DateCellProps> = ({ label, value, editable = false, onSave, highlight = 'none' }) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(formatDateInput(value));
  const [saving, setSaving] = useState(false);

  // Keep inputVal in sync if parent refreshes value
  React.useEffect(() => {
    if (!editing) setInputVal(formatDateInput(value));
  }, [value, editing]);

  const handleSave = async () => {
    if (!onSave) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(inputVal); // empty string = clear
      setEditing(false);
    } catch {
      toast.error('Failed to update date');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(''); // empty string signals clear
      setInputVal('');
      setEditing(false);
    } catch {
      toast.error('Failed to clear date');
    } finally {
      setSaving(false);
    }
  };

  const dotColor = value
    ? highlight === 'red' ? 'bg-red-500' : 'bg-green-500'
    : 'bg-gray-300';

  return (
    <div className="flex flex-col items-center min-w-[100px]">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mb-1.5`} />
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5 whitespace-nowrap">{label}</p>
      {editable && editing ? (
        <div className="flex flex-col items-center gap-1">
          <input
            type="date"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28 text-center"
            autoFocus
          />
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={saving}
              className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded hover:bg-blue-700 disabled:opacity-60">
              {saving ? '...' : 'Save'}
            </button>
            {value && (
              <button onClick={handleClear} disabled={saving}
                title="Clear date"
                className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded hover:bg-red-200 disabled:opacity-60">
                Clear
              </button>
            )}
            <button onClick={() => setEditing(false)} className="text-[10px] text-gray-500 hover:text-gray-700 px-1">✕</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => editable && setEditing(true)}
          className={`text-xs font-medium whitespace-nowrap ${
            value ? 'text-gray-700' : 'text-gray-300 italic'
          } ${editable && !value ? 'hover:text-blue-600 cursor-pointer' : editable ? 'hover:text-blue-600 cursor-pointer underline-offset-2 hover:underline' : 'cursor-default'}`}
        >
          {value ? formatDate(value) : editable ? 'click to set' : '—'}
        </button>
      )}
    </div>
  );
};

// Small arrow connector between lifecycle steps
const Arrow: React.FC<{ active: boolean }> = ({ active }) => (
  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 mt-3 ${active ? 'text-gray-400' : 'text-gray-200'}`} />
);

const ItemLifecycleRow: React.FC<ItemLifecycleRowProps> = ({ item, userRole, onUpdate, orderType }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { t } = useLanguage();

  // Partial receive state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQty, setReceiveQty] = useState(String(item.quantity));

  // Inline item edit state
  const [editingItem, setEditingItem] = useState(false);
  const [editDesc, setEditDesc] = useState(item.description);
  const [editQty, setEditQty] = useState(String(item.quantity));
  const [editCategory, setEditCategory] = useState(item.itemCategory ?? '');
  const [editAsset, setEditAsset] = useState(item.requiresAssetTagging);
  const [editIT, setEditIT] = useState(item.requiresITConfig);
  const [savingItem, setSavingItem] = useState(false);

  const canEditItem = CAN_EDIT_ITEM.includes(userRole);

  async function saveItemEdit() {
    if (!editDesc.trim() || !editQty) return;
    setSavingItem(true);
    try {
      await apiClient.put(`/items/${item.id}`, {
        description: editDesc.trim(),
        quantity: parseInt(editQty, 10),
        itemCategory: editCategory || undefined,
        requiresAssetTagging: editAsset,
        requiresITConfig: editIT,
      });
      toast.success('Item updated');
      setEditingItem(false);
      onUpdate();
    } catch {
      toast.error('Failed to update item');
    } finally {
      setSavingItem(false);
    }
  }

  function cancelItemEdit() {
    setEditDesc(item.description);
    setEditQty(String(item.quantity));
    setEditCategory(item.itemCategory ?? '');
    setEditAsset(item.requiresAssetTagging);
    setEditIT(item.requiresITConfig);
    setEditingItem(false);
  }

  const doAction = async (endpoint: string, label: string) => {
    setLoading(label);
    try {
      await apiClient.put(`/items/${item.id}/${endpoint}`, {});
      toast.success(`${label} recorded`);
      onUpdate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || `Failed to ${label.toLowerCase()}`);
    } finally {
      setLoading(null);
    }
  };

  const updateDate = async (field: string, date: string) => {
    if (date === '') {
      await apiClient.put(`/items/${item.id}/clear-date`, { fieldName: field });
    } else {
      await apiClient.put(`/items/${item.id}`, { [field]: date });
    }
    onUpdate();
  };

  const isServices = item.goodType === 'SERVICES' || item.status === 'SERVICES_ONLY';
  const canEditAllDates = ['ADMIN', 'PROCUREMENT', 'VENDOR_MANAGEMENT'].includes(userRole);

  const showReceive = !isServices && orderType !== 'PO' && CAN_RECEIVE.includes(userRole) &&
    (item.status === 'PENDING_DELIVERY' || item.status === 'DELAYED' || item.status === 'PARTIALLY_DELIVERED');
  const showAssetTag = !isServices && CAN_ASSET_TAG.includes(userRole) && item.status === 'PENDING_ASSET_TAGGING';
  const showITConfig = !isServices && CAN_IT_CONFIG.includes(userRole) && item.status === 'PENDING_IT_CONFIG';
  const showHandover = !isServices && CAN_HANDOVER.includes(userRole) &&
    (item.status === 'IT_CONFIGURED' || item.status === 'STORED' || item.status === 'ASSET_TAGGED');
  const isComplete = item.status === 'HANDED_OVER';
  const isDelayed = item.status === 'DELAYED';
  const isPartial = item.status === 'PARTIALLY_DELIVERED';
  const canEditClearance = CAN_CLEARANCE.includes(userRole);

  const handleReceive = async () => {
    const qty = parseInt(receiveQty, 10);
    if (isNaN(qty) || qty <= 0) { toast.error('Enter a valid quantity'); return; }
    setLoading('Receive');
    try {
      await apiClient.put(`/items/${item.id}/receive`, { quantityReceived: qty });
      toast.success(qty >= item.quantity ? 'Item fully received' : `${qty}/${item.quantity} received`);
      setShowReceiveModal(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to mark received');
    } finally {
      setLoading(null);
    }
  };

  const rowBg = isDelayed ? 'bg-red-50' : isPartial ? 'bg-amber-50' : isServices ? 'bg-slate-50' : 'bg-gray-50';

  return (
    <div className={`border-t border-gray-100 px-4 py-3 ${rowBg}`}>
      {/* Top row: item info + status + actions */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {editingItem ? (
            <div className="space-y-2 pr-2">
              <div className="flex gap-2">
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description"
                  className="flex-1 border border-blue-400 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number" min="1"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-16 border border-blue-400 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Category"
                  className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={editAsset} onChange={(e) => setEditAsset(e.target.checked)}
                    className="rounded border-gray-300 text-orange-500" />
                  Asset Tagging
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={editIT} onChange={(e) => setEditIT(e.target.checked)}
                    className="rounded border-gray-300 text-purple-500" />
                  IT Config
                </label>
                <div className="flex gap-1 ml-auto">
                  <button onClick={saveItemEdit} disabled={savingItem}
                    className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 disabled:opacity-60">
                    <Check className="w-3 h-3" />{savingItem ? '…' : 'Save'}
                  </button>
                  <button onClick={cancelItemEdit}
                    className="flex items-center gap-1 text-xs text-gray-500 border border-gray-300 px-2 py-1 rounded-md hover:bg-gray-50">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800 truncate">{item.description}</p>
              {item.itemCategory && (
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.itemCategory}</span>
              )}
              <span className="text-xs text-gray-500">
                Qty: <strong>{item.quantity}</strong>
                {item.quantityReceived != null && item.quantityReceived > 0 && item.quantityReceived < item.quantity && (
                  <span className="ml-1 text-amber-600 font-semibold">({item.quantityReceived} received)</span>
                )}
              </span>
              {isServices && (
                <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                  Services
                </span>
              )}
              {item.requisitionNumber && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  PR: {item.requisitionNumber}
                </span>
              )}
              {item.lineNumber && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {item.lineNumber}
                </span>
              )}
              {!isServices && item.requiresAssetTagging && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                  <Tag className="w-2.5 h-2.5" /> Asset Tag
                </span>
              )}
              {!isServices && item.requiresITConfig && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
                  <Settings className="w-2.5 h-2.5" /> IT Config
                </span>
              )}
              {canEditItem && (
                <button onClick={() => setEditingItem(true)}
                  className="text-gray-300 hover:text-blue-500 transition-colors ml-1"
                  title="Edit item">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {!editingItem && item.purchaseLink && (
            <a href={item.purchaseLink} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline mt-0.5 inline-block">
              Purchase link ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <StatusBadge status={item.status} type="item" />

          {showReceive && (
            <button onClick={() => { setReceiveQty(String(item.quantity)); setShowReceiveModal(true); }}
              disabled={loading === 'Receive'}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap">
              <Package className="w-3 h-3" />
              {loading === 'Receive' ? '…' : isPartial ? 'Update Received' : t('markReceived')}
            </button>
          )}
          {showAssetTag && (
            <button onClick={() => doAction('asset-tag', 'Asset Tag')} disabled={loading === 'Asset Tag'}
              className="flex items-center gap-1 text-xs bg-orange-500 text-white px-2.5 py-1.5 rounded-md hover:bg-orange-600 disabled:opacity-60 transition-colors whitespace-nowrap">
              <Tag className="w-3 h-3" />
              {loading === 'Asset Tag' ? '…' : t('markAssetTagged')}
            </button>
          )}
          {showITConfig && (
            <button onClick={() => doAction('it-config', 'IT Config')} disabled={loading === 'IT Config'}
              className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2.5 py-1.5 rounded-md hover:bg-purple-700 disabled:opacity-60 transition-colors whitespace-nowrap">
              <Settings className="w-3 h-3" />
              {loading === 'IT Config' ? '…' : t('markITConfig')}
            </button>
          )}
          {showHandover && (
            <button onClick={() => doAction('handover', 'Handover')} disabled={loading === 'Handover'}
              className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors whitespace-nowrap">
              <Handshake className="w-3 h-3" />
              {loading === 'Handover' ? '…' : t('markHandedOver')}
            </button>
          )}
          {isComplete && (
            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </span>
          )}
        </div>
      </div>

      {/* Services: no delivery lifecycle */}
      {isServices ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
          <Settings className="w-3.5 h-3.5" />
          Services item — no physical delivery lifecycle
        </div>
      ) : (
        /* Lifecycle timeline - scrollable */
        <div className="overflow-x-auto pb-1">
          <div className="flex items-start gap-0 min-w-max">
            <DateCell
              label="Expected"
              value={item.expectedDeliveryDate}
              editable={canEditAllDates}
              onSave={(d) => updateDate('expectedDeliveryDate', d)}
              highlight={isDelayed ? 'red' : item.expectedDeliveryDate ? 'green' : 'none'}
            />
            <Arrow active={!!item.receivedDate || isPartial} />
            <div className="flex flex-col items-center min-w-[100px]">
              <div className={`w-2.5 h-2.5 rounded-full mb-1.5 ${item.receivedDate ? 'bg-green-500' : isPartial ? 'bg-amber-400' : 'bg-gray-300'}`} />
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5 whitespace-nowrap">Received</p>
              {canEditAllDates ? (
                <DateCell
                  label=""
                  value={item.receivedDate}
                  editable={true}
                  onSave={(d) => {
                    // clearing receivedDate also resets storedDate on the server
                    return updateDate('receivedDate', d);
                  }}
                />
              ) : (
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  {item.receivedDate
                    ? formatDate(item.receivedDate)
                    : isPartial
                      ? <span className="text-amber-600">{item.quantityReceived}/{item.quantity}</span>
                      : <span className="text-gray-300 italic">—</span>
                  }
                </span>
              )}
              {isPartial && !canEditAllDates && (
                <span className="text-[10px] text-amber-500">{item.quantityReceived}/{item.quantity}</span>
              )}
            </div>
            <Arrow active={!!item.storedDate} />
            <DateCell
              label="Stored"
              value={item.storedDate}
              editable={canEditAllDates}
              onSave={(d) => updateDate('storedDate', d)}
            />

            {item.requiresAssetTagging && (
              <>
                <Arrow active={!!item.assetTaggingDate} />
                <DateCell
                  label="Asset Tagged"
                  value={item.assetTaggingDate}
                  editable={canEditAllDates}
                  onSave={(d) => updateDate('assetTaggingDate', d)}
                />
              </>
            )}

            {item.requiresITConfig && (
              <>
                <Arrow active={!!item.itConfigDate} />
                <DateCell
                  label="IT Config"
                  value={item.itConfigDate}
                  editable={canEditAllDates}
                  onSave={(d) => updateDate('itConfigDate', d)}
                />
              </>
            )}

            <Arrow active={!!item.handoverDate} />
            <DateCell
              label="Handed Over"
              value={item.handoverDate}
              editable={canEditAllDates}
              onSave={(d) => updateDate('handoverDate', d)}
            />

            <Arrow active={!!item.customClearanceDate} />
            <DateCell
              label="Clearance"
              value={item.customClearanceDate}
              editable={canEditClearance || canEditAllDates}
              onSave={(d) => updateDate('customClearanceDate', d)}
            />
          </div>
        </div>
      )}

      {/* Partial receive modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-5 w-72">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Mark Received</h3>
            <p className="text-xs text-gray-500 mb-3">
              Ordered: <strong>{item.quantity}</strong>
              {item.quantityReceived ? ` — Previously received: ${item.quantityReceived}` : ''}
            </p>
            <label className="block text-xs text-gray-600 mb-1">Quantity Received</label>
            <input
              type="number" min="1" max={item.quantity}
              value={receiveQty}
              onChange={(e) => setReceiveQty(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReceiveModal(false)}
                className="text-xs text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleReceive} disabled={loading === 'Receive'}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {loading === 'Receive' ? '…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {item.financeRemarks && (
        <p className="text-xs text-gray-500 mt-2 border-t border-gray-200 pt-2">
          <span className="font-medium text-gray-600">Remarks:</span> {item.financeRemarks}
        </p>
      )}
    </div>
  );
};

export default ItemLifecycleRow;
