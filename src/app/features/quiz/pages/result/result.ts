import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResultResponse } from '../../../../core/api/quiz-api';

import jsPDF from 'jspdf';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'result.html',
  styleUrls: ['./result.css'],
})
export class Result{
  result= signal<ResultResponse | null >(null);
  private router = inject(Router);
  private readonly LOGO_PATH = 'assets/logo_pdf.png';

  constructor() {
    /*tPrimero intentamos cogerlo del navigation state*/
    const nav = this.router.getCurrentNavigation();
    const stateResult = nav?.extras?.state?.['result'] as ResultResponse;

    if (stateResult) {
      this.result.set(stateResult);
      sessionStorage.setItem('retorika_last_result', JSON.stringify(stateResult));
      return;
    }
      /* Si no existe (ej: recarga página), lo cogemos del sessionStorage*/
    const saved = sessionStorage.getItem('retorika_last_result');
    if (saved) {
      this.result.set(JSON.parse(saved));
    }
  }

  getColor(style: string): string {
    switch (style) {
      case 'AGRESIVO': return '#e53935';
      case 'ASERTIVO': return '#43a047';
      case 'PASIVO': return '#1e88e5';
      default: return '#999';
    }
  }

  getLabel(style: string): string {
    switch (style) {
      case 'AGRESIVO': return 'Agresivo';
      case 'ASERTIVO': return 'Asertivo';
      case 'PASIVO': return 'Pasivo';
      default: return style;
    }
  }

  goHome() {
    // Reinicia resultado guardado si quieres obligar a rehacerlo desde cero
    this.router.navigate(['quiz', 'estilos-comunicacion']);
  }

  //------------------- PDF Helpers--------------------//
  private async loadLogo(): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
    // OJO: si el fichero no existe, aquí te saltará error (404)
    const response = await fetch(this.LOGO_PATH);
    if (!response.ok) {
      throw new Error(`Logo no encontrado en ${this.LOGO_PATH} (HTTP ${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    const format: 'PNG' | 'JPEG' = contentType.includes('png') ? 'PNG' : 'JPEG';

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el logo'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return { dataUrl, format };
  }

  private drawHeader(doc: jsPDF, opts: { logo?: { dataUrl: string; format: 'PNG' | 'JPEG' }, title: string; subtitle?: string }) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;

    // Logo
    if (opts.logo) {
      const logoW = 90;
      const logoH = 36;
      doc.addImage(opts.logo.dataUrl, opts.logo.format, marginX, 22, logoW, logoH);
    }

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(opts.title, marginX, 58);

    // Subtítulo (derecha)
    if (opts.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(opts.subtitle, pageWidth - marginX, 58, { align: 'right' });
      doc.setTextColor(0);
    }

    // Línea separadora
    doc.setDrawColor(220);
    doc.line(marginX, 70, pageWidth - marginX, 70);
  }

  private drawFooter(doc: jsPDF, opts: { footerLeft: string; pageNum: number; totalPages: number }) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;

    doc.setDrawColor(220);
    doc.line(marginX, pageHeight - 50, pageWidth - marginX, pageHeight - 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(opts.footerLeft, marginX, pageHeight - 32);

    doc.text(`Página ${opts.pageNum} de ${opts.totalPages}`, pageWidth - marginX, pageHeight - 32, {
      align: 'right',
    });

    doc.setTextColor(0);
  }

  private ensureSpace(doc: jsPDF, y: number, needed: number) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomLimit = pageHeight - 70; // reserva footer
    if (y + needed > bottomLimit) {
      doc.addPage();
      return 90; // arranca bajo la cabecera
    }
    return y;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  /**opcional */
   async downloadPdf() {
    const r = this.result();
    if (!r) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxTextWidth = pageWidth - marginX * 2;

    // Logo (si falla, seguimos sin logo)
    let logo: { dataUrl: string; format: 'PNG' | 'JPEG' } | undefined;
    try {
      logo = await this.loadLogo();
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
      logo = undefined;
    }

    let y = 90;

    const sectionTitle = (text: string) => {
      y = this.ensureSpace(doc, y, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(text, marginX, y);
      y += 14;

      doc.setDrawColor(235);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 16;
    };

    const paragraph = (text: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(text, maxTextWidth);
      y = this.ensureSpace(doc, y, lines.length * 14 + 10);
      doc.text(lines, marginX, y);
      y += lines.length * 14 + 10;
    };

    const box = (title: string, body: string) => {
      const padding = 12;
      const innerW = maxTextWidth - padding * 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(title, innerW);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const bodyLines = doc.splitTextToSize(body, innerW);

      const boxH = titleLines.length * 14 + bodyLines.length * 14 + padding * 2 + 6;
      y = this.ensureSpace(doc, y, boxH + 12);

      doc.setFillColor(246, 246, 246);
      doc.setDrawColor(235);
      doc.roundedRect(marginX, y, maxTextWidth, boxH, 10, 10, 'FD');

      let ty = y + padding + 12;
      doc.setFont('helvetica', 'bold');
      doc.text(titleLines, marginX + padding, ty);
      ty += titleLines.length * 14 + 6;

      doc.setFont('helvetica', 'normal');
      doc.text(bodyLines, marginX + padding, ty);

      y += boxH + 12;
    };

    const bar = (label: string, value: number, colorHex: string) => {
      y = this.ensureSpace(doc, y, 34);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`${label}: ${value}%`, marginX, y);

      const barX = marginX;
      const barY = y + 8;
      const barW = maxTextWidth;
      const barH = 10;

      doc.setFillColor(230, 230, 230);
      doc.roundedRect(barX, barY, barW, barH, 5, 5, 'F');

      const [rr, gg, bb] = this.hexToRgb(colorHex);
      doc.setFillColor(rr, gg, bb);
      doc.roundedRect(barX, barY, (barW * value) / 100, barH, 5, 5, 'F');

      y += 33;
    };

    // Contenido (sin header/footer global aún)
    this.drawHeader(doc, {
      logo,
      title: '',
      subtitle:new Date().toLocaleString(),
    });

    sectionTitle('Informe de Resultados');
    y = this.ensureSpace(doc, y, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    // Primera parte normal
    const prefix = 'Estilo predominante: ';
    doc.text(prefix, marginX, y);
    // Medimos ancho del texto anterior
    const prefixWidth = doc.getTextWidth(prefix);
    // Segunda parte en negrita
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.hexToRgb(this.getColor(r.dominantStyle)));
    doc.text(this.getLabel(r.dominantStyle), marginX + prefixWidth, y);
    doc.setTextColor(0);
    y += 18;
    //paragraph(`Estilo predominante: ${this.getLabel(r.dominantStyle)}.`);

    sectionTitle('Porcentajes');
    Object.entries(r.percentages ?? {}).forEach(([k, v]) => {
      bar(this.getLabel(k), Number(v), this.getColor(k));
    });

    if (r.infoBlocks?.length) {
      sectionTitle('Recomendaciones');
      r.infoBlocks.forEach((b: any) => box(b.title ?? 'Recomendación', b.text ?? ''));
    }

    // Header/footer en todas las páginas (con total)
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.drawHeader(doc, {
        logo,
        title: '',
        subtitle:new Date().toLocaleString(),
      });
      this.drawFooter(doc, {
        footerLeft: 'Uso personal — Resultados del cuestionario',
        pageNum: i,
        totalPages,
      });
    }

    doc.save('retorika-informe.pdf');
  }
}
