import React from 'react';
import type { CertificatePdfData } from '../../services/certificatePdfService';

export const CertificateDocument: React.FC<{ data: CertificatePdfData }> = ({ data }) => (
  <article className="relative aspect-[297/210] w-full overflow-hidden bg-white text-[#061d4e] shadow-2xl" aria-label={data.preview ? 'Certificate preview' : `Certificate for ${data.studentName}`}>
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 297 210" aria-hidden="true">
      <rect width="297" height="210" fill="#fff" />
      <path d="M0 0H79C54 8 28 23 0 58Z" fill="#061d4e" />
      <path d="M3 3H68C44 12 22 28 3 48Z" fill="#d09b31" />
      <path d="M0 0H58C38 8 18 19 0 38Z" fill="#061d4e" />
      <path d="M297 210H218C244 200 272 184 297 153Z" fill="#061d4e" />
      <path d="M294 207H228C253 196 276 180 294 163Z" fill="#d09b31" />
      <path d="M297 210H240C259 202 279 190 297 173Z" fill="#061d4e" />
      <g fill="none" stroke="#d09b31" strokeWidth=".45" opacity=".28">
        <path d="M2 75C33 42 54 124 81 177" /><path d="M2 80C34 47 56 129 83 181" /><path d="M295 73C263 45 243 124 217 176" /><path d="M295 78C262 50 241 129 215 181" />
      </g>
      <rect x="4.5" y="4.5" width="288" height="201" fill="none" stroke="#061d4e" strokeWidth="1.6" />
      <rect x="7" y="7" width="283" height="196" fill="none" stroke="#d09b31" strokeWidth=".55" />
      <rect x="9" y="9" width="279" height="192" fill="none" stroke="#d09b31" strokeWidth=".25" />
      <path d="M12 19V11H28M269 11H285V27M12 181V197H28M269 197H285V181" fill="none" stroke="#d09b31" strokeWidth=".7" />
    </svg>

    {data.preview && <div className="absolute left-1/2 top-[3.5%] -translate-x-1/2 rounded-full bg-slate-100/90 px-3 py-1 text-[clamp(5px,.78vw,9px)] font-black tracking-wider text-slate-500">PREVIEW - NOT OFFICIAL</div>}
    <img src="/learnendo-logo-transp.png" alt="Learnendo" className="absolute right-[7%] top-[6%] h-[17%] w-auto object-contain" />

    <div className="relative flex h-full flex-col items-center text-center">
      <div className="mt-[7%] text-center leading-none">
        <h1 className="font-serif text-[clamp(24px,6vw,70px)] font-black tracking-[0.08em]">CERTIFICATE</h1>
        <div className="mt-[1%] flex items-center justify-center gap-[2%] text-[#c48920]">
          <span className="h-px w-[9%] bg-[#c48920]" /><p className="font-serif text-[clamp(13px,2.75vw,32px)] font-bold">OF COMPLETION</p><span className="h-px w-[9%] bg-[#c48920]" />
        </div>
      </div>
      <p className="mt-[2.1%] text-[clamp(7px,1.2vw,14px)] font-black tracking-[0.16em]">THIS CERTIFIES THAT</p>
      <p className="mt-[1.1%] min-w-[57%] max-w-[72%] border-b border-[#c48920] px-[4%] pb-[.5%] font-serif text-[clamp(21px,4.8vw,56px)] italic leading-none">{data.studentName}</p>
      <p className="mt-[2.1%] max-w-[56%] text-[clamp(7px,1.25vw,15px)] font-medium leading-relaxed">
        has successfully completed the <strong>Learnendo English Program</strong>, including <strong>10,800 exercises</strong>, and has fulfilled the completion requirements of the course.
      </p>
      <div className="mt-[1.1%] h-px w-[35%] bg-[#c48920]" />
      <p className="mt-[1.1%] max-w-[49%] text-[clamp(6px,1.05vw,13px)] leading-relaxed">
        This certificate recognizes dedication, perseverance, and progress in learning English.
      </p>

      <div className="absolute bottom-[13%] left-[13%] w-[23%]">
        <div className="h-[clamp(18px,3.8vw,44px)]" aria-hidden="true" />
        <div className="border-t border-[#c48920] pt-[2%] text-[clamp(5px,.72vw,9px)] font-black tracking-widest">DATE</div>
        {data.dateLabel && <p className="absolute inset-x-0 bottom-[28%] font-serif text-[clamp(6px,1vw,12px)]">{data.dateLabel}</p>}
      </div>

      <div className="absolute bottom-[11.5%] left-1/2 h-[20%] aspect-square -translate-x-1/2 rounded-full bg-[#d09b31] p-[1.2%] shadow-md [clip-path:polygon(50%_0%,58%_7%,68%_3%,74%_13%,85%_12%,88%_23%,98%_28%,94%_40%,100%_50%,94%_60%,98%_72%,88%_77%,85%_88%,74%_87%,68%_97%,58%_93%,50%_100%,42%_93%,32%_97%,26%_87%,15%_88%,12%_77%,2%_72%,6%_60%,0%_50%,6%_40%,2%_28%,12%_23%,15%_12%,26%_13%,32%_3%,42%_7%)]">
        <div className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-[#f4d67c] bg-[#061d4e] text-[#f4d67c]">
          <span className="text-[clamp(16px,3vw,36px)]">▱</span>
        </div>
      </div>

      <div className="absolute bottom-[11.5%] right-[12%] w-[25%]">
        <img src="/certificate-signature.png" alt="Authorized signature" className="mx-auto -mb-[4%] h-[clamp(28px,7vw,82px)] w-full object-contain" />
        <div className="border-t border-[#c48920] pt-[2%] text-[clamp(5px,.72vw,9px)] font-black tracking-widest">AUTHORIZED SIGNATURE</div>
      </div>

      {data.certificateId && <p className="absolute bottom-[4.3%] left-[8%] text-[clamp(4px,.58vw,7px)] text-slate-500">Certificate ID: {data.certificateId}</p>}
      <div className="absolute bottom-[2.3%] left-1/2 flex h-[6.5%] w-[56%] -translate-x-1/2 items-center justify-center bg-[#061d4e] px-[3%] text-[clamp(5px,.82vw,10px)] font-black tracking-[0.12em] text-white [clip-path:polygon(4%_0,96%_0,92%_50%,96%_100%,4%_100%,8%_50%)]">
        LEARNENDO — LEARN ENGLISH WITH CONFIDENCE
      </div>
    </div>
  </article>
);
