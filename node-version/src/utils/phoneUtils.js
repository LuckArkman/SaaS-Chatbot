/**
 * Utilitários para tratamento de números de telefone, 
 * especialmente focados na inconsistência do 9º dígito no Brasil.
 */

/**
 * Normaliza um número para o formato canônico do banco de dados: 55DDD9XXXXXXXX (13 dígitos)
 * @param {string} phone - Número bruto
 * @returns {string} Número normalizado
 */
function normalizeToDb(phone) {
  if (!phone) return '';
  const phoneStr = String(phone);
  
  // Preserva JIDs de grupos
  if (phoneStr.endsWith('@g.us')) {
    return phoneStr;
  }

  let digits = phoneStr.replace(/\D/g, '');

  // Se não tem código do país, assume 55
  if (digits.length <= 11 && !digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // Tratamento específico para Brasil (55)
  if (digits.startsWith('55')) {
    const areaCode = digits.substring(2, 4);
    const number = digits.substring(4);

    // Se tem 12 dígitos (55 + DDD + 8 dígitos), injeta o 9
    if (digits.length === 12) {
      return `55${areaCode}9${number}`;
    }
    
    // Se tem 13 dígitos mas o 5º dígito não é 9 (55 + DDD + 8 dígitos onde o 1º é < 7?)
    // No Brasil, o 9º dígito é sempre 9.
    if (digits.length === 13 && digits[4] !== '9') {
       return `55${areaCode}9${digits.substring(5)}`;
    }
  }

  return digits;
}

/**
 * Normaliza para o formato JID do WhatsApp (Baileys)
 * @param {string} phone 
 * @returns {string}
 */
function normalizeToJid(phone) {
  const phoneStr = String(phone);
  if (phoneStr.endsWith('@g.us')) return phoneStr;
  
  const digits = normalizeToDb(phone);
  return `${digits}@s.whatsapp.net`;
}

/**
 * Verifica se o número está no formato canônico estrito (13 dígitos) ou é um grupo
 * @param {string} phone 
 * @returns {boolean}
 */
function isValidDbFormat(phone) {
  const phoneStr = String(phone);
  if (phoneStr.endsWith('@g.us')) return true;
  return /^[0-9]{8,30}$/.test(phoneStr);
}

module.exports = {
  normalizeToDb,
  normalizeToJid,
  isValidDbFormat
};
