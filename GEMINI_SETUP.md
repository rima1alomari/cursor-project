# إعداد Google Gemini API للدردشة الذكية

## خطوات الحصول على مفتاح API:

1. اذهب إلى: https://makersuite.google.com/app/apikey
2. سجل الدخول بحساب Google الخاص بك
3. انقر على "Create API Key"
4. انسخ المفتاح الذي تم إنشاؤه

## كيفية إضافة المفتاح:

1. افتح الملف: `scripts/chatbot.js`
2. ابحث عن السطر:
   ```javascript
   const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
   ```
3. استبدل `YOUR_GEMINI_API_KEY_HERE` بمفتاح API الخاص بك
4. احفظ الملف

## مثال:
```javascript
const GEMINI_API_KEY = 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

## ملاحظات:
- المفتاح مجاني للاستخدام المحدود
- لا تشارك مفتاح API مع أي شخص
- إذا لم تقم بإضافة المفتاح، سيعمل الدردشة بنظام الردود الأساسي

---

# Google Gemini API Setup for Chatbot

## Steps to Get API Key:

1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

## How to Add the Key:

1. Open file: `scripts/chatbot.js`
2. Find the line:
   ```javascript
   const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
   ```
3. Replace `YOUR_GEMINI_API_KEY_HERE` with your API key
4. Save the file

## Example:
```javascript
const GEMINI_API_KEY = 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

## Notes:
- The key is free for limited use
- Don't share your API key with anyone
- If you don't add the key, the chatbot will use basic fallback responses


