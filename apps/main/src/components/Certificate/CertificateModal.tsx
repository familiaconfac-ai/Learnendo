import React, { useState } from 'react';
import type { LearnendoCertificateRecord } from '../../models/certification';
import { formatCertificateDate } from '../../models/certification';
import { downloadCertificatePdf, type CertificatePdfData } from '../../services/certificatePdfService';
import { CertificateDocument } from './CertificateDocument';

export const DEMO_CERTIFICATE: CertificatePdfData = {
  studentName: 'John McMartin',
  dateLabel: '',
  certificateId: 'PREVIEW-DEMO',
  preview: true,
};

export function certificateDataFromRecord(record: LearnendoCertificateRecord): CertificatePdfData {
  return {
    studentName: record.studentDisplayName,
    dateLabel: formatCertificateDate(record.certificateDate),
    certificateId: record.certificateId,
  };
}

export const CertificateModal: React.FC<{
  record?: LearnendoCertificateRecord | null;
  preview?: boolean;
  onClose: () => void;
}> = ({ record, preview = false, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const data = preview ? DEMO_CERTIFICATE : record ? certificateDataFromRecord(record) : null;
  if (!data) return null;
  const download = async () => {
    setDownloading(true);
    try { await downloadCertificatePdf(data); } finally { setDownloading(false); }
  };
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="certificate-modal-title" onClick={onClose}>
      <div className="w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <div><h2 id="certificate-modal-title" className="text-xl font-black">{preview ? 'Certificate Preview' : 'My Certificate'}</h2>{preview && <p className="text-sm text-slate-300">Demonstration only. No approval, official date or certificate record is created.</p>}</div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-600 px-4 py-2 font-bold">Close</button>
        </div>
        <CertificateDocument data={data} />
        <div className="mt-4 flex justify-center">
          <button type="button" disabled={downloading} onClick={() => void download()} className="rounded-2xl bg-blue-600 px-7 py-3 font-black text-white shadow-lg disabled:opacity-60">{downloading ? 'Preparing PDF…' : 'Download PDF'}</button>
        </div>
      </div>
    </div>
  );
};
