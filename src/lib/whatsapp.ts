/** A wa.me click-to-chat link: opens the device's own WhatsApp with this number pre-filled — never an API, never auto-sent. */
export function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}
