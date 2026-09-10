/**
 * Google Form and Google Sheets integration service for Time2Trade CRM
 */

export const GOOGLE_FORM_RESPONSE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdEPUeP_q3MepAw5j-tgJa23HsD-lixzMoihND9Z1AhdhXxJQ/formResponse';

export const GOOGLE_FORM_VIEW_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdEPUeP_q3MepAw5j-tgJa23HsD-lixzMoihND9Z1AhdhXxJQ/viewform';

export const GOOGLE_FORM_ENTRIES = {
  clientName: 'entry.296808543',
  clientPhone: 'entry.1646904639',
  serviceCategory: 'entry.306110806',
  serviceType: 'entry.1355689734',
  subscriptionDuration: 'entry.492004714',
  primaryEmployee: 'entry.1702720898',
  amount: 'entry.1193149425',
  paymentMode: 'entry.507882490',
  utr: 'entry.1903456714',
  receiverBank: 'entry.1374647109',
  transactionDate: 'entry.1663408271',
  allocationsAndProof: 'entry.1552774651',
} as const;

export interface PaymentSubmissionPayload {
  referenceId: string;
  clientName: string;
  clientPhone: string;
  serviceCategory: string;
  serviceType: string;
  subscriptionDuration: string;
  primaryEmployeeName: string;
  amount: number;
  paymentMode: string;
  utr: string;
  receiverBank: string;
  transactionDate: string; // YYYY-MM-DD
  screenshotUrl: string;
  allocationSummary: string;
  remarks?: string;
}

/**
 * Standardize Payment Mode text for Google Form choices
 */
export function mapPaymentModeForGoogleForm(mode: string): string {
  if (mode === 'UPI') return 'UPI Transfer';
  if (mode === 'Bank Transfer') return 'Bank Transfer / IMPS';
  return 'OTHER';
}

/**
 * Standardize Subscription Duration text for Google Form choices
 */
export function mapDurationForGoogleForm(duration: string): string {
  if (duration === '3 Months') return '3 months';
  if (duration === '6 Months') return '6 months';
  return 'yearly';
}

/**
 * Construct pre-filled Google Form URL with all 12 entries
 */
export function buildPrefilledGoogleFormUrl(payload: PaymentSubmissionPayload): string {
  const gFormMode = mapPaymentModeForGoogleForm(payload.paymentMode);
  const gFormDuration = mapDurationForGoogleForm(payload.subscriptionDuration);
  const effectiveBank = payload.receiverBank.trim() || 'N/A';

  const proofEntryText = [
    payload.remarks?.trim() ? `Remarks: ${payload.remarks.trim()}` : null,
    `Allocations: ${payload.allocationSummary}`,
    payload.screenshotUrl ? `Screenshot Proof: ${payload.screenshotUrl}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const params = new URLSearchParams({
    usp: 'pp_url',
    [GOOGLE_FORM_ENTRIES.clientName]: payload.clientName.trim(),
    [GOOGLE_FORM_ENTRIES.clientPhone]: payload.clientPhone.trim(),
    [GOOGLE_FORM_ENTRIES.serviceCategory]: payload.serviceCategory,
    [GOOGLE_FORM_ENTRIES.serviceType]: payload.serviceType,
    [GOOGLE_FORM_ENTRIES.subscriptionDuration]: gFormDuration,
    [GOOGLE_FORM_ENTRIES.primaryEmployee]: payload.primaryEmployeeName,
    [GOOGLE_FORM_ENTRIES.amount]: String(payload.amount),
    [GOOGLE_FORM_ENTRIES.paymentMode]: gFormMode,
    [GOOGLE_FORM_ENTRIES.utr]: payload.utr.trim(),
    [GOOGLE_FORM_ENTRIES.receiverBank]: effectiveBank,
    [GOOGLE_FORM_ENTRIES.transactionDate]: payload.transactionDate,
    [GOOGLE_FORM_ENTRIES.allocationsAndProof]: proofEntryText,
  });

  return `${GOOGLE_FORM_VIEW_URL}?${params.toString()}`;
}

/**
 * Format a single row formatted as Tab-Separated Values (TSV)
 * for instant 1-click pasting into Google Spreadsheets (Ctrl+V)
 */
export function formatSpreadsheetRowTSV(payload: PaymentSubmissionPayload): string {
  const gFormMode = mapPaymentModeForGoogleForm(payload.paymentMode);
  const gFormDuration = mapDurationForGoogleForm(payload.subscriptionDuration);
  const effectiveBank = payload.receiverBank.trim() || 'N/A';

  const columns = [
    new Date().toLocaleString('en-IN'),
    payload.clientName.trim(),
    payload.clientPhone.trim(),
    payload.serviceCategory,
    payload.serviceType,
    gFormDuration,
    payload.primaryEmployeeName,
    payload.amount,
    gFormMode,
    payload.utr.trim(),
    effectiveBank,
    payload.transactionDate,
    payload.allocationSummary,
    payload.screenshotUrl || 'No Screenshot URL',
    payload.referenceId,
  ];

  return columns.map((c) => String(c).replace(/\t/g, ' ')).join('\t');
}

/**
 * Format an array of Payments from CRM into Tab-Separated Values (TSV) with headers
 * for instant 1-click bulk copying and pasting into Google Spreadsheets (Ctrl+V)
 */
export function formatPaymentsBatchTSV(payments: any[]): string {
  const headers = [
    'Timestamp',
    'Client Name',
    'Client Phone',
    'Service Category',
    'Service Type',
    'Duration',
    'Primary Employee',
    'Amount (INR)',
    'Payment Mode',
    'UTR / Reference',
    'Receiver Bank',
    'Transaction Date',
    'Staff Allocations',
    'Screenshot Proof URL',
    'Reference ID',
    'Status',
  ];

  const rows = payments.map((p) => {
    const displayName = p.client_name || p.trader_name || 'N/A';
    const displayPhone = p.client_phone || p.trader_phone || 'N/A';
    const displayEmp = p.employee_name || p.submitted_by_employee_name || 'Staff';
    const allocationsText = Array.isArray(p.allocations)
      ? p.allocations.map((a: any) => `${a.employee_name}: ₹${a.allocation_amount}`).join('; ')
      : 'N/A';

    return [
      p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'),
      displayName,
      displayPhone,
      p.service_category || 'Equity',
      p.service_type || 'Cash',
      p.subscription_duration || '3 Months',
      displayEmp,
      p.amount || 0,
      p.payment_mode || 'UPI',
      p.utr || 'N/A',
      p.receiver_bank_name || 'N/A',
      p.transaction_time ? p.transaction_time.split('T')[0] : new Date().toISOString().split('T')[0],
      allocationsText,
      p.screenshot_url || 'No Screenshot',
      p.id || 'N/A',
      p.status || 'pending_verification',
    ].map((c) => String(c).replace(/[\t\r\n]/g, ' ')).join('\t');
  });

  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * Submit to Google Form using an invisible iframe target.
 * Unlike fetch(no-cors), an HTML form submission with target="hidden_iframe"
 * triggers a genuine browser form POST navigation that bypasses fetch CORS blocks.
 */
export function submitToGoogleFormViaHiddenIframe(payload: PaymentSubmissionPayload): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    try {
      const iframeId = 't2t_gform_submission_frame';
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.name = iframeId;
        iframe.style.position = 'fixed';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = GOOGLE_FORM_RESPONSE_URL;
      form.target = iframeId;
      form.style.display = 'none';

      const gFormPaymentMode = mapPaymentModeForGoogleForm(payload.paymentMode);
      const gFormDuration = mapDurationForGoogleForm(payload.subscriptionDuration);
      const effectiveBank = payload.receiverBank.trim() || 'N/A';
      const proofEntryText = [
        payload.remarks?.trim() ? `Remarks: ${payload.remarks.trim()}` : null,
        `Allocations: ${payload.allocationSummary}`,
        payload.screenshotUrl ? `Screenshot Proof: ${payload.screenshotUrl}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const fieldEntries: [string, string][] = [
        [GOOGLE_FORM_ENTRIES.clientName, payload.clientName.trim()],
        [GOOGLE_FORM_ENTRIES.clientPhone, payload.clientPhone.trim()],
        [GOOGLE_FORM_ENTRIES.serviceCategory, payload.serviceCategory],
        [GOOGLE_FORM_ENTRIES.serviceType, payload.serviceType],
        [GOOGLE_FORM_ENTRIES.subscriptionDuration, gFormDuration],
        [GOOGLE_FORM_ENTRIES.primaryEmployee, payload.primaryEmployeeName],
        [GOOGLE_FORM_ENTRIES.amount, String(payload.amount)],
        [GOOGLE_FORM_ENTRIES.paymentMode, gFormPaymentMode],
        [GOOGLE_FORM_ENTRIES.utr, payload.utr.trim()],
        [GOOGLE_FORM_ENTRIES.receiverBank, effectiveBank],
        [GOOGLE_FORM_ENTRIES.transactionDate, payload.transactionDate],
        [GOOGLE_FORM_ENTRIES.allocationsAndProof, proofEntryText],
      ];

      fieldEntries.forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

      // Clean up the temporary form after submission
      setTimeout(() => {
        if (form.parentNode) {
          form.parentNode.removeChild(form);
        }
        resolve(true);
      }, 1200);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieve saved Google Sheets Webhook URL from env or localStorage
 */
export function getSavedGoogleSheetsWebhookUrl(): string {
  if (typeof window === 'undefined') return '';
  const fromStorage = localStorage.getItem('t2t_google_sheets_webhook_url');
  if (fromStorage && fromStorage.trim().startsWith('http')) {
    return fromStorage.trim();
  }
  const fromEnv = (import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL as string) || '';
  if (fromEnv && fromEnv.trim().startsWith('http')) {
    return fromEnv.trim();
  }
  return '';
}

/**
 * Save Google Sheets Webhook URL
 */
export function saveGoogleSheetsWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('t2t_google_sheets_webhook_url', url.trim());
}

/**
 * Dispatch submission directly to Google Sheets Webhook (Apps Script)
 */
export async function dispatchToGoogleSheetsWebhook(
  payload: PaymentSubmissionPayload,
  customWebhookUrl?: string
): Promise<{ success: boolean; message?: string }> {
  const webhookUrl = customWebhookUrl || getSavedGoogleSheetsWebhookUrl();
  if (!webhookUrl) {
    return { success: false, message: 'No Google Sheets webhook URL configured' };
  }

  try {
    const postBody = {
      timestamp: new Date().toISOString(),
      reference_id: payload.referenceId,
      client_name: payload.clientName.trim(),
      client_phone: payload.clientPhone.trim(),
      service_category: payload.serviceCategory,
      service_type: payload.serviceType,
      subscription_duration: payload.subscriptionDuration,
      primary_employee: payload.primaryEmployeeName,
      amount: payload.amount,
      payment_mode: mapPaymentModeForGoogleForm(payload.paymentMode),
      utr: payload.utr.trim(),
      receiver_bank: payload.receiverBank.trim() || 'N/A',
      transaction_date: payload.transactionDate,
      screenshot_url: payload.screenshotUrl,
      allocations: payload.allocationSummary,
      remarks: payload.remarks?.trim() || '',
    };

    // Using text/plain prevents CORS preflight OPTIONS check while allowing Google Apps Script e.postData.contents to receive JSON
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(postBody),
    });

    return { success: true, message: 'Dispatched to Google Sheet Webhook' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to dispatch to Google Sheets webhook' };
  }
}

/**
 * Dual-channel silent submission to Google Form & Google Sheets
 */
export async function submitPaymentToGoogleFormDualChannel(
  payload: PaymentSubmissionPayload
): Promise<{ hiddenIframe: boolean; webhookDispatched: boolean }> {
  // 1. Channel A: Invisible Iframe Form POST (bypasses fetch CORS blocks)
  const iframePromise = submitToGoogleFormViaHiddenIframe(payload);

  // 2. Channel B: Background fetch POST (Parallel redundant dispatch)
  try {
    const gFormPaymentMode = mapPaymentModeForGoogleForm(payload.paymentMode);
    const gFormDuration = mapDurationForGoogleForm(payload.subscriptionDuration);
    const effectiveBank = payload.receiverBank.trim() || 'N/A';
    const proofEntryText = [
      payload.remarks?.trim() ? `Remarks: ${payload.remarks.trim()}` : null,
      `Allocations: ${payload.allocationSummary}`,
      payload.screenshotUrl ? `Screenshot Proof: ${payload.screenshotUrl}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const formData = new URLSearchParams();
    formData.append(GOOGLE_FORM_ENTRIES.clientName, payload.clientName.trim());
    formData.append(GOOGLE_FORM_ENTRIES.clientPhone, payload.clientPhone.trim());
    formData.append(GOOGLE_FORM_ENTRIES.serviceCategory, payload.serviceCategory);
    formData.append(GOOGLE_FORM_ENTRIES.serviceType, payload.serviceType);
    formData.append(GOOGLE_FORM_ENTRIES.subscriptionDuration, gFormDuration);
    formData.append(GOOGLE_FORM_ENTRIES.primaryEmployee, payload.primaryEmployeeName);
    formData.append(GOOGLE_FORM_ENTRIES.amount, String(payload.amount));
    formData.append(GOOGLE_FORM_ENTRIES.paymentMode, gFormPaymentMode);
    formData.append(GOOGLE_FORM_ENTRIES.utr, payload.utr.trim());
    formData.append(GOOGLE_FORM_ENTRIES.receiverBank, effectiveBank);
    formData.append(GOOGLE_FORM_ENTRIES.transactionDate, payload.transactionDate);
    formData.append(GOOGLE_FORM_ENTRIES.allocationsAndProof, proofEntryText);

    fetch(GOOGLE_FORM_RESPONSE_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }).catch(() => {});
  } catch {
    // Silent
  }

  // 3. Channel C: Google Sheets Apps Script Webhook (if configured)
  let webhookDispatched = false;
  try {
    const res = await dispatchToGoogleSheetsWebhook(payload);
    webhookDispatched = res.success;
  } catch {
    webhookDispatched = false;
  }

  const hiddenIframe = await iframePromise;
  return { hiddenIframe, webhookDispatched };
}

/**
 * Ready-to-use Google Apps Script Code snippet for 100% automated sheet synchronization
 * and programmatic submission to Google Form responses
 */
export const GOOGLE_APPS_SCRIPT_SNIPPET = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // 1. Programmatically record response in linked Google Form (increments Form Response count)
    try {
      var formUrl = ss.getFormUrl();
      if (formUrl) {
        var form = FormApp.openByUrl(formUrl);
        var formResponse = form.createResponse();
        var items = form.getItems();
        
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var title = (item.getTitle() || '').toLowerCase();
          
          if (title.indexOf('client') !== -1 || title.indexOf('name') !== -1) {
            if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(data.client_name || ''));
            }
          } else if (title.indexOf('phone') !== -1 || title.indexOf('contact') !== -1 || title.indexOf('mobile') !== -1) {
            if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(data.client_phone || ''));
            }
          } else if (title.indexOf('amount') !== -1) {
            if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(String(data.amount || '')));
            }
          } else if (title.indexOf('utr') !== -1 || title.indexOf('ref') !== -1) {
            if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(data.utr || ''));
            }
          } else if (title.indexOf('bank') !== -1) {
            if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(data.receiver_bank || ''));
            }
          } else if (title.indexOf('mode') !== -1) {
            if (item.getType() === FormApp.ItemType.LIST) {
              formResponse.withItemResponse(item.asListItem().createResponse(data.payment_mode || ''));
            } else if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
              formResponse.withItemResponse(item.asMultipleChoiceItem().createResponse(data.payment_mode || ''));
            } else if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(data.payment_mode || ''));
            }
          } else if (title.indexOf('date') !== -1) {
            if (item.getType() === FormApp.ItemType.DATE) {
              formResponse.withItemResponse(item.asDateItem().createResponse(new Date(data.transaction_date)));
            } else if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(data.transaction_date || ''));
            }
          } else if (title.indexOf('proof') !== -1 || title.indexOf('screenshot') !== -1 || title.indexOf('allocation') !== -1) {
            var summary = (data.screenshot_url ? 'Proof: ' + data.screenshot_url + ' | ' : '') + (data.allocations || '');
            if (item.getType() === FormApp.ItemType.PARAGRAPH_TEXT) {
              formResponse.withItemResponse(item.asParagraphTextItem().createResponse(summary));
            } else if (item.getType() === FormApp.ItemType.TEXT) {
              formResponse.withItemResponse(item.asTextItem().createResponse(summary));
            }
          }
        }
        formResponse.submit();
      }
    } catch(formErr) {
      // Proceed to sheet append even if form submission encountered custom field differences
    }

    // 2. Save screenshot image directly into a Google Drive folder (like old Google Form)
    var finalProofUrl = data.screenshot_url || '';
    if (data.screenshot_url && data.screenshot_url.indexOf('http') === 0) {
      try {
        var folderName = "Time2Trade Payment Proofs";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        var imgBlob = UrlFetchApp.fetch(data.screenshot_url).getBlob();
        var clientClean = (data.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        var utrClean = (data.utr || 'Proof').replace(/[^a-zA-Z0-9]/g, '_');
        imgBlob.setName(clientClean + '_' + utrClean + '.jpg');
        var driveFile = folder.createFile(imgBlob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        finalProofUrl = driveFile.getUrl();
      } catch (driveErr) {
        // Fallback to original CDN url if DriveApp quota or permission fails
      }
    }

    // 3. Append row directly to the spreadsheet
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.client_name,
      data.client_phone,
      data.service_category,
      data.service_type,
      data.subscription_duration,
      data.primary_employee,
      data.amount,
      data.payment_mode,
      data.utr,
      data.receiver_bank,
      data.transaction_date,
      finalProofUrl || data.screenshot_url,
      data.allocations,
      data.reference_id
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", drive_url: finalProofUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
