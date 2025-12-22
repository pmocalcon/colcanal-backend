import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
  priority: 'alta' | 'normal';
  itemsCount: number;
  deadline?: Date;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP no configurado. Las notificaciones por correo están deshabilitadas.');
      this.logger.warn('Configure las variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
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
    this.logger.log(`Servicio de correo configurado: ${smtpUser}`);
  }

  async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`Correo no enviado (SMTP no configurado): ${notification.subject}`);
      return false;
    }

    try {
      const fromEmail = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');

      await this.transporter.sendMail({
        from: `"Sistema de Gestión" <${fromEmail}>`,
        to: notification.to,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
      });

      this.logger.log(`Correo enviado a: ${notification.to} - Asunto: ${notification.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${notification.to}: ${error.message}`);
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
    const priorityBadge = data.priority === 'alta'
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
              ${data.projectName ? `
              <div class="info-row">
                <span class="label">Proyecto:</span>
                <span>${data.projectName}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="label">Prioridad:</span>
                <span>${priorityBadge}</span>
              </div>
              <div class="info-row">
                <span class="label">Materiales:</span>
                <span>${data.itemsCount} ítem(s)</span>
              </div>
              ${data.deadline ? `
              <div class="info-row">
                <span class="label">Fecha límite:</span>
                <span style="color: #dc3545;">${new Date(data.deadline).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              ` : ''}
            </div>

            ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">Ver Requisición</a>` : ''}
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
      subject: `📋 Nueva requisición ${data.requisitionNumber} pendiente de revisión${data.priority === 'alta' ? ' [URGENTE]' : ''}`,
      html,
    });
  }

  async notifyRequisitionReviewed(
    creatorEmail: string,
    creatorName: string,
    data: RequisitionNotificationData & { approved: boolean; comments?: string },
  ): Promise<boolean> {
    const statusIcon = data.approved ? '✅' : '❌';
    const statusText = data.approved ? 'APROBADA por Revisión' : 'RECHAZADA por Revisión';
    const statusColor = data.approved ? '#28a745' : '#dc3545';

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
            <p>Tu requisición <strong>${data.requisitionNumber}</strong> ha sido ${data.approved ? 'aprobada' : 'rechazada'} en la etapa de revisión.</p>

            ${data.comments ? `
            <div class="comments">
              <strong>Comentarios:</strong>
              <p>${data.comments}</p>
            </div>
            ` : ''}

            <p>${data.approved ? 'La requisición pasará ahora a la siguiente etapa de aprobación.' : 'Por favor revisa los comentarios y realiza las correcciones necesarias.'}</p>
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
      subject: `${statusIcon} Tu requisición ${data.requisitionNumber} fue ${data.approved ? 'aprobada' : 'rechazada'}`,
      html,
    });
  }

  async notifyRequisitionForApproval(
    approverEmail: string,
    approverName: string,
    data: RequisitionNotificationData,
  ): Promise<boolean> {
    const priorityBadge = data.priority === 'alta'
      ? '<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">PRIORIDAD ALTA</span>'
      : '';

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
              ${data.projectName ? `<p><strong>Proyecto:</strong> ${data.projectName}</p>` : ''}
              <p><strong>Materiales:</strong> ${data.itemsCount} ítem(s)</p>
            </div>

            ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">Revisar y Aprobar</a>` : ''}
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
      subject: `🔐 Requisición ${data.requisitionNumber} pendiente de aprobación${data.priority === 'alta' ? ' [URGENTE]' : ''}`,
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
    const priorityBadge = data.priority === 'alta'
      ? '<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">URGENTE</span>'
      : '';

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
            ${data.projectName ? `<p><strong>Proyecto:</strong> ${data.projectName}</p>` : ''}

            ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">Ir a Cotizar</a>` : ''}
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
      subject: `💰 Requisición ${data.requisitionNumber} lista para cotizar${data.priority === 'alta' ? ' [URGENTE]' : ''}`,
      html,
    });
  }

  // ============================================
  // VERIFICACIÓN DE CONFIGURACIÓN
  // ============================================

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return { success: false, message: 'SMTP no configurado' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Conexión SMTP exitosa' };
    } catch (error) {
      return { success: false, message: `Error: ${error.message}` };
    }
  }
}
