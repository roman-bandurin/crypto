/**
 * i18n/locales/en.ts
 *
 * English messages. Структура ключей должна совпадать
 * с ru.ts — оба файла описывают один и тот же словарь.
 */

const en = {
  app: {
    title: 'Cryptographic service',
  },
  select: {
    algorithm: 'Algorithm',
    method: 'Method',
    length: 'Length',
  },
  action: {
    encrypt: 'Encrypt',
    generate: 'Generate',
    get: 'Get',
    decrypt: 'Decrypt',
  },
  field: {
    encryption: 'Encryption',
    sender: 'Sender',
    recipient: 'Recipient',
    publicKey: 'Public key',
    privateKey: 'Private key',
    verification: 'Verification',
    copy: 'Copy to clipboard',
  },
  algorithms: {
    groups: {
      hashing: 'Hashing',
      symmetricEncryption: 'Symmetric encryption',
      asymmetricEncryption: 'Asymmetric encryption',
      asymmetricSignature: 'Asymmetric digital signature',
      symmetricSignature: 'Symmetric digital signature',
    },
  },
  result: {
    cipher: 'Cipher(sender: {sender})',
    cipherWithKey: 'Cipher(sender: {sender}, key: {key})',
    decipher: 'Decryption({text})',
    decipherWithKey: 'Decryption({text}, key: {key})',
    decipherWithSender: 'Decryption({text}, key: {key}) with sender {sender}',
  },
  key: {
    public: 'public key',
    private: 'private key',
  },
  tour: {
    enable: 'Enable tour',
    disable: 'Disable tour',
    step: 'Step {n}',
    hints: {
      1: 'Choose an encryption or signature algorithm from the list.',
      2: 'Specify the method (e.g. SHA-256) if it is available.',
      3: 'Choose the key length if the algorithm has options.',
      4: 'Enter the original message in the "Sender" field.',
      5: 'Generate or enter the key required by the algorithm.',
      6: 'Click "Encrypt" — the result will appear in the "Encryption" field.',
      7: 'Click "Get" to pass the ciphertext to the "Recipient" field.',
      8: 'Make sure the key for decryption is filled in.',
      9: 'Click "Decrypt" and compare the result in the "Verification" field.',
    },
    steps: {
      1: {
        title: 'Select algorithm',
        description:
          'Choose an encryption algorithm from the list of available ones. Each algorithm has its own features and areas of application.',
      },
      2: {
        title: 'Configure parameters',
        description:
          'Configure the algorithm parameters: method and key length. Longer keys provide better protection.',
      },
      3: {
        title: 'Key generation',
        description:
          'Generate keys for encryption. For asymmetric algorithms, a public and a private key will be created.',
      },
      4: {
        title: 'Encryption',
        description:
          'Enter the text to encrypt in the "Sender" field and click the "Encrypt" button.',
      },
      5: {
        title: 'Message transfer',
        description: 'Click "Get" to pass the encrypted message to the "Recipient" field.',
      },
      6: {
        title: 'Decryption',
        description:
          'Click "Decrypt" to verify. The result will appear in the "Verification" field.',
      },
    },
  },
  ai: {
    title: 'AI assistant',
    settings: 'Settings',
    clear: 'Clear conversation',
    close: 'Close',
    preset: 'Provider',
    baseUrl: 'Base URL ([OI]-compatible)',
    apiKey: 'API key',
    model: 'Model',
    input: 'Message the assistant…',
    empty: 'Ask anything or pick a ready-made scenario.',
    toolDetails: 'Arguments and result',
    prompt: {
      digest: 'Compute SHA-256 for the string "hello"',
      encrypt: 'Generate an AES-GCM 256 key and encrypt "secret"',
      sign: 'Sign "document" with ECDSA and verify the signature',
    },
    error: {
      notConfigured: 'Set the base URL and model in chat settings.',
      request: 'Model request failed:',
      cors: 'Your local server seems to block requests. In LM Studio enable CORS (lms server start --cors) and retry.',
    },
  },
  theme: {
    light: 'Light theme',
    dark: 'Dark theme',
  },
  language: {
    label: 'Interface language',
    ru: 'Русский',
    en: 'English',
  },
}

export default en
