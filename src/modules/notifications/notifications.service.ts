import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface RequisitionNotificationData {
  requisitionNumber: string;
  creatorName: string;
  projectName?: string;
  priority: "alta" | "normal";
  itemsCount: number;
  deadline?: Date;
  actionUrl?: string;
}

export interface WorksNotificationData {
  entityType: "levantamiento" | "acta";
  identifier: string;
  workName?: string;
  companyName?: string;
  projectName?: string;
  municipality?: string;
  actorName?: string;
  createdBy?: string;
  blockName?: string;
  worksCount?: number;
  projectCode?: string;
  comments?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private isConfigured = false;

  // Microsoft Graph (envío OAuth2 app-only). Si está configurado tiene prioridad sobre SMTP.
  private graphConfigured = false;
  private graphTenantId?: string;
  private graphClientId?: string;
  private graphClientSecret?: string;
  private graphSender?: string;
  private graphToken?: { accessToken: string; expiresAt: number };

  constructor(private configService: ConfigService) {
    this.initializeGraph();
    this.initializeTransporter();
  }

  private initializeGraph() {
    this.graphTenantId = this.configService.get<string>("GRAPH_TENANT_ID");
    this.graphClientId = this.configService.get<string>("GRAPH_CLIENT_ID");
    this.graphClientSecret = this.configService.get<string>(
      "GRAPH_CLIENT_SECRET",
    );
    this.graphSender =
      this.configService.get<string>("GRAPH_SENDER") ||
      this.configService.get<string>("SMTP_FROM") ||
      this.configService.get<string>("SMTP_USER");

    if (
      this.graphTenantId &&
      this.graphClientId &&
      this.graphClientSecret &&
      this.graphSender
    ) {
      this.graphConfigured = true;
      this.logger.log(
        `Servicio de correo (Microsoft Graph) configurado: ${this.graphSender}`,
      );
    }
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>("SMTP_HOST");
    const smtpPort = this.configService.get<number>("SMTP_PORT");
    const smtpUser = this.configService.get<string>("SMTP_USER");
    const smtpPass = this.configService.get<string>("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      if (!this.graphConfigured) {
        this.logger.warn(
          "Sin proveedor de correo configurado. Las notificaciones están deshabilitadas.",
        );
        this.logger.warn(
          "Configure Microsoft Graph (GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_SENDER) o SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).",
        );
      }
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.isConfigured = true;
    this.logger.log(`Servicio de correo (SMTP) configurado: ${smtpUser}`);
  }

  /**
   * Obtiene (y cachea) un token de acceso app-only para Microsoft Graph
   * mediante el flujo client credentials.
   */
  private async getGraphToken(): Promise<string> {
    const now = Date.now();
    if (this.graphToken && this.graphToken.expiresAt > now + 60_000) {
      return this.graphToken.accessToken;
    }

    const url = `https://login.microsoftonline.com/${this.graphTenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.graphClientId!,
      client_secret: this.graphClientSecret!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`No se pudo obtener token de Graph (${res.status}): ${detail}`);
    }

    const json: any = await res.json();
    this.graphToken = {
      accessToken: json.access_token,
      expiresAt: now + Number(json.expires_in || 3600) * 1000,
    };
    return this.graphToken.accessToken;
  }

  private async sendViaGraph(
    notification: EmailNotification,
  ): Promise<boolean> {
    try {
      const token = await this.getGraphToken();
      const recipients = notification.to
        .split(/[;,]/)
        .map((address) => address.trim())
        .filter(Boolean)
        .map((address) => ({ emailAddress: { address } }));

      const message: any = {
        subject: notification.subject,
        body: { contentType: "HTML", content: notification.html },
        toRecipients: recipients,
      };

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
          this.graphSender!,
        )}/sendMail`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message, saveToSentItems: false }),
        },
      );

      if (res.status === 202) {
        this.logger.log(
          `Correo enviado (Graph) a: ${notification.to} - Asunto: ${notification.subject}`,
        );
        return true;
      }

      const detail = await res.text();
      this.logger.error(
        `Error enviando correo (Graph) a ${notification.to}: ${res.status} ${detail}`,
      );
      return false;
    } catch (error) {
      this.logger.error(
        `Error enviando correo (Graph) a ${notification.to}: ${error.message}`,
      );
      return false;
    }
  }

  async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (this.graphConfigured) {
      return this.sendViaGraph(notification);
    }

    if (!this.isConfigured) {
      this.logger.warn(
        `Correo no enviado (sin proveedor configurado): ${notification.subject}`,
      );
      return false;
    }

    try {
      const fromEmail =
        this.configService.get<string>("SMTP_FROM") ||
        this.configService.get<string>("SMTP_USER");

      await this.transporter.sendMail({
        from: `"Sistema de Gestión" <${fromEmail}>`,
        to: notification.to,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
      });

      this.logger.log(
        `Correo enviado a: ${notification.to} - Asunto: ${notification.subject}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error enviando correo a ${notification.to}: ${error.message}`,
      );
      return false;
    }
  }

  // ============================================
  // NOTIFICACIONES DE REQUISICIONES
  // ============================================

  async notifyNewRequisitionForReview(
    reviewerEmail: string,
    reviewerName: string,
    data: RequisitionNotificationData,
  ): Promise<boolean> {
    const priorityBadge =
      data.priority === "alta"
        ? '<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">PRIORIDAD ALTA</span>'
        : '<span style="background-color: #6c757d; color: white; padding: 2px 8px; border-radius: 4px;">Normal</span>';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8b500; padding: 20px; text-align: center; }
          .header h1 { margin: 0; color: #333; font-size: 24px; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #666; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #f8b500; color: #333; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Nueva Requisición Pendiente</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${reviewerName}</strong>,</p>
            <p>Se ha creado una nueva requisición que requiere tu revisión:</p>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Número:</span>
                <span><strong>${data.requisitionNumber}</strong></span>
              </div>
              <div class="info-row">
                <span class="label">Creado por:</span>
                <span>${data.creatorName}</span>
              </div>
              ${
                data.projectName
                  ? `
              <div class="info-row">
                <span class="label">Proyecto:</span>
                <span>${data.projectName}</span>
              </div>
              `
                  : ""
              }
              <div class="info-row">
                <span class="label">Prioridad:</span>
                <span>${priorityBadge}</span>
              </div>
              <div class="info-row">
                <span class="label">Materiales:</span>
                <span>${data.itemsCount} ítem(s)</span>
              </div>
              ${
                data.deadline
                  ? `
              <div class="info-row">
                <span class="label">Fecha límite:</span>
                <span style="color: #dc3545;">${new Date(data.deadline).toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              `
                  : ""
              }
            </div>

            ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">Ver Requisición</a>` : ""}
          </div>
          <div class="footer">
            <p>Sistema de Gestión Empresarial - Canalcongroup</p>
            <p>Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: reviewerEmail,
      subject: `📋 Nueva requisición ${data.requisitionNumber} pendiente de revisión${data.priority === "alta" ? " [URGENTE]" : ""}`,
      html,
    });
  }

  async notifyRequisitionReviewed(
    creatorEmail: string,
    creatorName: string,
    data: RequisitionNotificationData & {
      approved: boolean;
      comments?: string;
    },
  ): Promise<boolean> {
    const statusIcon = data.approved ? "✅" : "❌";
    const statusText = data.approved
      ? "APROBADA por Revisión"
      : "RECHAZADA por Revisión";
    const statusColor = data.approved ? "#28a745" : "#dc3545";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; padding: 20px; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 24px; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .comments { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusIcon} Requisición ${statusText}</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${creatorName}</strong>,</p>
            <p>Tu requisición <strong>${data.requisitionNumber}</strong> ha sido ${data.approved ? "aprobada" : "rechazada"} en la etapa de revisión.</p>

            ${
              data.comments
                ? `
            <div class="comments">
              <strong>Comentarios:</strong>
              <p>${data.comments}</p>
            </div>
            `
                : ""
            }

            <p>${data.approved ? "La requisición pasará ahora a la siguiente etapa de aprobación." : "Por favor revisa los comentarios y realiza las correcciones necesarias."}</p>
          </div>
          <div class="footer">
            <p>Sistema de Gestión Empresarial - Canalcongroup</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: creatorEmail,
      subject: `${statusIcon} Tu requisición ${data.requisitionNumber} fue ${data.approved ? "aprobada" : "rechazada"}`,
      html,
    });
  }

  async notifyRequisitionForApproval(
    approverEmail: string,
    approverName: string,
    data: RequisitionNotificationData,
  ): Promise<boolean> {
    const priorityBadge =
      data.priority === "alta"
        ? '<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">PRIORIDAD ALTA</span>'
        : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; padding: 20px; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 24px; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Requisición Pendiente de Aprobación</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${approverName}</strong>,</p>
            <p>La siguiente requisición requiere tu aprobación:</p>

            <div class="info-box">
              <p><strong>Número:</strong> ${data.requisitionNumber} ${priorityBadge}</p>
              <p><strong>Creado por:</strong> ${data.creatorName}</p>
              ${data.projectName ? `<p><strong>Proyecto:</strong> ${data.projectName}</p>` : ""}
              <p><strong>Materiales:</strong> ${data.itemsCount} ítem(s)</p>
            </div>

            ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">Revisar y Aprobar</a>` : ""}
          </div>
          <div class="footer">
            <p>Sistema de Gestión Empresarial - Canalcongroup</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: approverEmail,
      subject: `🔐 Requisición ${data.requisitionNumber} pendiente de aprobación${data.priority === "alta" ? " [URGENTE]" : ""}`,
      html,
    });
  }

  async notifyRequisitionApproved(
    creatorEmail: string,
    creatorName: string,
    data: RequisitionNotificationData,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; padding: 20px; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 24px; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Requisición Aprobada por Gerencia</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${creatorName}</strong>,</p>
            <p>Tu requisición <strong>${data.requisitionNumber}</strong> ha sido <strong>aprobada por Gerencia</strong>.</p>
            <p>La requisición pasará ahora al proceso de cotización.</p>
          </div>
          <div class="footer">
            <p>Sistema de Gestión Empresarial - Canalcongroup</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: creatorEmail,
      subject: `✅ Tu requisición ${data.requisitionNumber} fue aprobada`,
      html,
    });
  }

  async notifyRequisitionReadyForQuotation(
    quoterEmail: string,
    quoterName: string,
    data: RequisitionNotificationData,
  ): Promise<boolean> {
    const priorityBadge =
      data.priority === "alta"
        ? '<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">URGENTE</span>'
        : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #17a2b8; padding: 20px; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 24px; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Requisición Lista para Cotizar</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${quoterName}</strong>,</p>
            <p>La requisición <strong>${data.requisitionNumber}</strong> ${priorityBadge} está lista para cotización.</p>
            <p><strong>Materiales a cotizar:</strong> ${data.itemsCount} ítem(s)</p>
            ${data.projectName ? `<p><strong>Proyecto:</strong> ${data.projectName}</p>` : ""}

            ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">Ir a Cotizar</a>` : ""}
          </div>
          <div class="footer">
            <p>Sistema de Gestión Empresarial - Canalcongroup</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: quoterEmail,
      subject: `💰 Requisición ${data.requisitionNumber} lista para cotizar${data.priority === "alta" ? " [URGENTE]" : ""}`,
      html,
    });
  }

  // ============================================
  // NOTIFICACIONES DE ANULACIÓN DE REQUISICIÓN
  // ============================================

  private buildVoidEmail(
    recipientName: string,
    title: string,
    headerColor: string,
    bodyHtml: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${headerColor}; padding: 20px; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 22px; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .comments { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>${this.escapeHtml(title)}</h1></div>
          <div class="content">
            <p>Hola <strong>${this.escapeHtml(recipientName)}</strong>,</p>
            ${bodyHtml}
          </div>
          <div class="footer"><p>Sistema de Gestión Empresarial - Canalcongroup</p></div>
        </div>
      </body>
      </html>
    `;
  }

  async notifyVoidRequested(
    recipientEmail: string,
    recipientName: string,
    data: { requisitionNumber: string; requesterName?: string; motivo?: string },
  ): Promise<boolean> {
    const html = this.buildVoidEmail(
      recipientName,
      "🗑️ Solicitud de anulación de requisición",
      "#7c3aed",
      `<p>${this.escapeHtml(data.requesterName ?? "Compras")} solicitó anular la requisición <strong>${this.escapeHtml(data.requisitionNumber)}</strong> y requiere su aprobación.</p>
       ${data.motivo ? `<div class="comments"><strong>Motivo:</strong><p>${this.escapeHtml(data.motivo)}</p></div>` : ""}`,
    );
    return this.sendEmail({
      to: recipientEmail,
      subject: `🗑️ Solicitud de anulación — Requisición ${data.requisitionNumber}`,
      html,
    });
  }

  async notifyVoidApproved(
    recipientEmail: string,
    recipientName: string,
    data: { requisitionNumber: string },
  ): Promise<boolean> {
    const html = this.buildVoidEmail(
      recipientName,
      "✅ Anulación aprobada",
      "#16a34a",
      `<p>La Directora Financiera <strong>aprobó</strong> la anulación de la requisición <strong>${this.escapeHtml(data.requisitionNumber)}</strong>. La requisición quedó anulada.</p>`,
    );
    return this.sendEmail({
      to: recipientEmail,
      subject: `✅ Anulación aprobada — Requisición ${data.requisitionNumber}`,
      html,
    });
  }

  async notifyVoidRejected(
    recipientEmail: string,
    recipientName: string,
    data: { requisitionNumber: string; motivo?: string },
  ): Promise<boolean> {
    const html = this.buildVoidEmail(
      recipientName,
      "❌ Anulación rechazada",
      "#dc2626",
      `<p>La Directora Financiera <strong>rechazó</strong> la solicitud de anulación de la requisición <strong>${this.escapeHtml(data.requisitionNumber)}</strong>. La requisición NO fue anulada y volvió a su estado anterior.</p>
       ${data.motivo ? `<div class="comments"><strong>Motivo del rechazo:</strong><p>${this.escapeHtml(data.motivo)}</p></div>` : ""}`,
    );
    return this.sendEmail({
      to: recipientEmail,
      subject: `❌ Anulación rechazada — Requisición ${data.requisitionNumber}`,
      html,
    });
  }

  // ============================================
  // NOTIFICACIONES DE ÓRDENES DE COMPRA
  // ============================================

  async notifyPurchaseOrderApproved(
    recipientEmail: string,
    recipientName: string,
    data: { purchaseOrderNumber: string; requisitionNumber?: string; approverName?: string },
  ): Promise<boolean> {
    const html = this.buildVoidEmail(
      recipientName,
      "✅ Orden de compra aprobada",
      "#16a34a",
      `<p>La Gerencia <strong>aprobó</strong> la orden de compra <strong>${this.escapeHtml(data.purchaseOrderNumber)}</strong>${
        data.requisitionNumber
          ? ` de la requisición <strong>${this.escapeHtml(data.requisitionNumber)}</strong>`
          : ""
      }.</p>
       ${data.approverName ? `<p>Aprobada por: <strong>${this.escapeHtml(data.approverName)}</strong></p>` : ""}`,
    );
    return this.sendEmail({
      to: recipientEmail,
      subject: `✅ Orden de compra aprobada — ${data.purchaseOrderNumber}`,
      html,
    });
  }

  // ============================================
  // NOTIFICACIONES DE OBRAS / LEVANTAMIENTOS
  // ============================================

  private escapeHtml(value?: string | number | null): string {
    if (value === undefined || value === null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private buildWorksRows(data: WorksNotificationData): string {
    const rows: Array<[string, string | number | undefined]> = [
      [data.entityType === "acta" ? "Acta" : "Levantamiento", data.identifier],
      ["Obra", data.workName],
      ["Empresa", data.companyName],
      ["Proyecto", data.projectName],
      ["Municipio", data.municipality],
      ["Bloque", data.blockName],
      ["Obras asociadas", data.worksCount],
      ["Codigo de proyecto", data.projectCode],
      ["Creado por", data.createdBy],
      ["Accion realizada por", data.actorName],
    ];

    return rows
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(
        ([label, value]) => `
          <div class="info-row">
            <span class="label">${this.escapeHtml(label)}:</span>
            <span>${this.escapeHtml(value)}</span>
          </div>
        `,
      )
      .join("");
  }

  private async sendWorksWorkflowNotification(
    recipientEmail: string,
    recipientName: string,
    subject: string,
    title: string,
    message: string,
    data: WorksNotificationData,
    accentColor: string,
    actionLabel?: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 640px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${accentColor}; padding: 20px; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 24px; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .info-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #666; }
          .comments { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .btn { display: inline-block; padding: 12px 24px; background-color: ${accentColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.escapeHtml(title)}</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${this.escapeHtml(recipientName)}</strong>,</p>
            <p>${this.escapeHtml(message)}</p>

            <div class="info-box">
              ${this.buildWorksRows(data)}
            </div>

            ${
              data.comments
                ? `
            <div class="comments">
              <strong>Comentarios:</strong>
              <p>${this.escapeHtml(data.comments)}</p>
            </div>
            `
                : ""
            }

            ${data.actionUrl && actionLabel ? `<a href="${this.escapeHtml(data.actionUrl)}" class="btn">${this.escapeHtml(actionLabel)}</a>` : ""}
          </div>
          <div class="footer">
            <p>Sistema de Gestion Empresarial - Canalcongroup</p>
            <p>Este es un correo automatico, por favor no responda a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
    });
  }

  async notifySurveySubmittedForReview(
    reviewerEmail: string,
    reviewerName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      reviewerEmail,
      reviewerName,
      `Levantamiento ${data.identifier} pendiente de revision`,
      "Levantamiento pendiente de revision",
      "Se envio un levantamiento para tu revision.",
      data,
      "#f59e0b",
      "Revisar levantamiento",
    );
  }

  async notifySurveyReviewed(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData & { approved: boolean },
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Levantamiento ${data.identifier} ${data.approved ? "aprobado" : "rechazado"}`,
      `Levantamiento ${data.approved ? "aprobado" : "rechazado"}`,
      `Tu levantamiento fue ${data.approved ? "aprobado" : "rechazado"}.`,
      data,
      data.approved ? "#16a34a" : "#dc2626",
      "Ver levantamiento",
    );
  }

  async notifySurveyBlockReviewed(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData & { approved: boolean },
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Bloque ${data.blockName || ""} del levantamiento ${data.identifier} ${data.approved ? "aprobado" : "rechazado"}`,
      `Bloque ${data.approved ? "aprobado" : "rechazado"}`,
      `Se ${data.approved ? "aprobo" : "rechazo"} un bloque de tu levantamiento.`,
      data,
      data.approved ? "#16a34a" : "#dc2626",
      "Ver levantamiento",
    );
  }

  async notifySurveyReopened(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Levantamiento ${data.identifier} reabierto para edicion`,
      "Levantamiento reabierto",
      "Tu levantamiento fue reabierto para edicion.",
      data,
      "#f59e0b",
      "Editar levantamiento",
    );
  }

  async notifyActaSubmittedForReview(
    reviewerEmail: string,
    reviewerName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      reviewerEmail,
      reviewerName,
      `Acta ${data.identifier} pendiente de revision tecnica`,
      "Acta pendiente de revision tecnica",
      "Se envio un acta para revision tecnica.",
      data,
      "#f59e0b",
      "Ver acta",
    );
  }

  async notifyCronogramaSubmitted(
    reviewerEmail: string,
    reviewerName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      reviewerEmail,
      reviewerName,
      `Cronograma del acta ${data.identifier} pendiente de revision`,
      "Cronograma pendiente de revision",
      "Se envio el plan del cronograma para revision del Director Tecnico.",
      data,
      "#f59e0b",
      "Ver cronograma",
    );
  }

  async notifyCronogramaApproved(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Cronograma del acta ${data.identifier} aprobado`,
      "Cronograma aprobado",
      "El Director Tecnico aprobo el plan del cronograma. Ya puedes continuar con la ejecucion.",
      data,
      "#16a34a",
      "Ver cronograma",
    );
  }

  async notifyCronogramaRejected(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Cronograma del acta ${data.identifier} devuelto`,
      "Cronograma devuelto",
      "El Director Tecnico devolvio el plan del cronograma. Revisa el comentario, corrige y vuelve a enviarlo.",
      data,
      "#dc2626",
      "Editar cronograma",
    );
  }

  async notifyActaReviewed(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData & { approved: boolean },
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Acta ${data.identifier} ${data.approved ? "revisada" : "devuelta"}`,
      `Acta ${data.approved ? "revisada" : "devuelta"}`,
      data.approved
        ? "El acta fue revisada y enviada a aprobacion de Gerencia de Proyectos."
        : "El acta fue devuelta a borrador para correccion.",
      data,
      data.approved ? "#2563eb" : "#dc2626",
      "Ver acta",
    );
  }

  async notifyActaForApproval(
    approverEmail: string,
    approverName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      approverEmail,
      approverName,
      `Acta ${data.identifier} pendiente de aprobacion`,
      "Acta pendiente de aprobacion",
      "Un acta revisada requiere aprobacion de Gerencia de Proyectos.",
      data,
      "#2563eb",
      "Aprobar acta",
    );
  }

  async notifyActaSentToBudget(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Acta ${data.identifier} enviada a presupuesto`,
      "Acta enviada a presupuesto",
      "Un acta fue enviada a presupuesto y requiere su revision/aprobacion.",
      data,
      "#7c3aed",
      "Ver presupuesto",
    );
  }

  async notifyActaApproved(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Acta ${data.identifier} aprobada`,
      "Acta aprobada",
      "El acta fue aprobada por Gerencia de Proyectos.",
      data,
      "#16a34a",
      "Ver acta",
    );
  }

  async notifyActaBudgetApproved(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Presupuesto del acta ${data.identifier} aprobado`,
      "Presupuesto del acta aprobado",
      "La Directora Financiera aprobó el presupuesto del acta.",
      data,
      "#16a34a",
      "Ver acta",
    );
  }

  async notifyActaBudgetRejected(
    recipientEmail: string,
    recipientName: string,
    data: WorksNotificationData,
  ): Promise<boolean> {
    return this.sendWorksWorkflowNotification(
      recipientEmail,
      recipientName,
      `Presupuesto del acta ${data.identifier} rechazado`,
      "Presupuesto del acta rechazado",
      "La Directora Financiera rechazó el presupuesto del acta. Revise el motivo y vuelva a enviarlo a presupuesto.",
      data,
      "#dc2626",
      "Ver acta",
    );
  }

  // ============================================
  // VERIFICACIÓN DE CONFIGURACIÓN
  // ============================================

  isEmailConfigured(): boolean {
    return this.graphConfigured || this.isConfigured;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.graphConfigured) {
      try {
        await this.getGraphToken();
        return {
          success: true,
          message: `Conexión Microsoft Graph exitosa (remitente: ${this.graphSender})`,
        };
      } catch (error) {
        return { success: false, message: `Error Graph: ${error.message}` };
      }
    }

    if (!this.isConfigured) {
      return { success: false, message: "Sin proveedor de correo configurado" };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: "Conexión SMTP exitosa" };
    } catch (error) {
      return { success: false, message: `Error: ${error.message}` };
    }
  }
}
