import React from 'react'
class TelegramService {
  constructor(botToken) {
    this.botToken = botToken;
    this.baseURL = `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(chatId, message, options = {}) {
    if (!this.botToken || !chatId) {
      throw new Error('Bot token and chat ID are required');
    }

    try {
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...options
      };

      const response = await fetch(`${this.baseURL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to send Telegram message: ${error.message}`);
    }
  }

  async sendPhoto(chatId, photo, caption = '', options = {}) {
    if (!this.botToken || !chatId) {
      throw new Error('Bot token and chat ID are required');
    }

    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', photo);
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
      }

      Object.keys(options).forEach(key => {
        formData.append(key, options[key]);
      });

      const response = await fetch(`${this.baseURL}/sendPhoto`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to send Telegram photo: ${error.message}`);
    }
  }

  async sendDocument(chatId, document, caption = '', options = {}) {
    if (!this.botToken || !chatId) {
      throw new Error('Bot token and chat ID are required');
    }

    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('document', document);
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
      }

      Object.keys(options).forEach(key => {
        formData.append(key, options[key]);
      });

      const response = await fetch(`${this.baseURL}/sendDocument`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to send Telegram document: ${error.message}`);
    }
  }

  async editMessage(chatId, messageId, newText, options = {}) {
    if (!this.botToken || !chatId || !messageId) {
      throw new Error('Bot token, chat ID, and message ID are required');
    }

    try {
      const payload = {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'Markdown',
        ...options
      };

      const response = await fetch(`${this.baseURL}/editMessageText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to edit Telegram message: ${error.message}`);
    }
  }

  async deleteMessage(chatId, messageId) {
    if (!this.botToken || !chatId || !messageId) {
      throw new Error('Bot token, chat ID, and message ID are required');
    }

    try {
      const payload = {
        chat_id: chatId,
        message_id: messageId
      };

      const response = await fetch(`${this.baseURL}/deleteMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to delete Telegram message: ${error.message}`);
    }
  }

  async getMe() {
    if (!this.botToken) {
      throw new Error('Bot token is required');
    }

    try {
      const response = await fetch(`${this.baseURL}/getMe`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get bot info: ${error.message}`);
    }
  }

  formatSignalMessage(analysis) {
    const emoji = analysis.signal === 'long' ? '🟢' : '🔴';
    const direction = analysis.signal.toUpperCase();
    
    let message = `${emoji} *${direction} SIGNAL* ${emoji}\n\n`;
    message += `💰 *Symbol:* ${analysis.symbol}\n`;
    message += `📊 *Pattern:* ${analysis.patterns[0]?.name || 'Multiple Patterns'}\n`;
    message += `⚡ *Confidence:* ${analysis.confidence}%\n`;
    message += `📈 *Timeframe:* ${analysis.timeframe}\n\n`;
    
    message += `💵 *Entry:* ${analysis.levels.entry}\n`;
    message += `🛑 *Stop Loss:* ${analysis.levels.stopLoss}\n`;
    message += `🎯 *TP1:* ${analysis.levels.takeProfit1}\n`;
    message += `🎯 *TP2:* ${analysis.levels.takeProfit2}\n`;
    message += `🎯 *TP3:* ${analysis.levels.takeProfit3}\n`;
    message += `📊 *R:R:* 1:${analysis.levels.riskReward}\n\n`;
    
    if (analysis.elliottWave?.currentWave) {
      message += `🌊 *Elliott Wave:* ${analysis.elliottWave.currentWave}\n`;
    }
    
    if (analysis.smartMoney?.bias) {
      message += `🧠 *SMC Bias:* ${analysis.smartMoney.bias}\n`;
    }
    
    message += `\n📝 *Analysis:*\n${analysis.reason}\n\n`;
    message += `⏰ ${new Date().toLocaleString()}`;
    
    return message;
  }

  formatUpdateMessage(analysis, previousAnalysis) {
    const emoji = analysis.signal === 'long' ? '🟢' : '🔴';
    
    let message = `🔄 *SIGNAL UPDATE* 🔄\n\n`;
    message += `${emoji} *${analysis.symbol}* - ${analysis.signal.toUpperCase()}\n`;
    message += `📊 *Confidence:* ${previousAnalysis.confidence}% → ${analysis.confidence}%\n\n`;
    
    if (analysis.levels.entry !== previousAnalysis.levels.entry) {
      message += `💵 *Entry Updated:* ${analysis.levels.entry}\n`;
    }
    
    if (analysis.levels.stopLoss !== previousAnalysis.levels.stopLoss) {
      message += `🛑 *SL Updated:* ${analysis.levels.stopLoss}\n`;
    }
    
    message += `\n⏰ ${new Date().toLocaleString()}`;
    
    return message;
  }

  async testConnection() {
    try {
      const result = await this.getMe();
      return { success: true, botInfo: result.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default TelegramService;
