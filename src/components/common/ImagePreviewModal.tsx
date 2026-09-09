import React, { useState } from 'react';
import { Modal } from './Modal';
import { ZoomIn, ZoomOut, RotateCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatINR, formatDate } from '../../lib/formatters';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  paymentDetails?: {
    paymentCode: string;
    clientName: string;
    amount: number;
    referenceNumber: string;
    paymentMethod: string;
    paymentDate: string;
  };
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  paymentDetails,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentDetails ? `Proof Preview: ${paymentDetails.paymentCode}` : 'Document Preview'}
      subtitle="Verify screenshot against bank reference details"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Payment Summary Header inside modal */}
        {paymentDetails && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client</span>
              <span className="font-bold text-slate-800">{paymentDetails.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Amount</span>
              <span className="font-extrabold text-emerald-600">{formatINR(paymentDetails.amount)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reference / UTR</span>
              <span className="font-mono font-bold text-blue-600">{paymentDetails.referenceNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date & Method</span>
              <span className="font-medium text-slate-700">{paymentDetails.paymentMethod} • {formatDate(paymentDetails.paymentDate)}</span>
            </div>
          </div>
        )}

        {/* Image Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-400 ml-1 font-mono">Zoom: {Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Size
              </a>
            )}
            <div className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Encrypted Storage</span>
            </div>
          </div>
        </div>

        {/* Image Display Area */}
        <div className="relative min-h-[280px] max-h-[480px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 p-4">
          <div
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-out',
            }}
            className="max-w-full max-h-full flex items-center justify-center"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Payment proof screenshot"
                className="max-w-full max-h-[420px] object-contain rounded-lg"
              />
            ) : (
              /* SVG Interactive Mock Receipt graphic if image is missing */
              <div className="bg-white text-slate-900 p-6 rounded-lg shadow-2xl max-w-sm w-full border border-slate-200 font-sans text-xs space-y-3">
                <div className="text-center border-b pb-3">
                  <div className="font-extrabold text-base tracking-tight text-blue-900">UPI PAYMENT SUCCESSFUL</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Indian Banking Switch • NPCI Reference</div>
                </div>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paid To:</span>
                    <span className="font-bold">TradeOffice Escrow Desk</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-bold text-emerald-700">{paymentDetails ? formatINR(paymentDetails.amount) : '₹1,50,000.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref / UTR:</span>
                    <span className="font-bold text-blue-700">{paymentDetails?.referenceNumber || 'UPI/429810928190'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span>{paymentDetails ? formatDate(paymentDetails.paymentDate) : '18 Aug 2026, 11:15 AM'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-emerald-600 font-bold">SUCCESS (BANK VERIFIED)</span>
                  </div>
                </div>
                <div className="border-t pt-2 text-[10px] text-slate-400 text-center">
                  Digital Payment Screenshot Proof Container
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
