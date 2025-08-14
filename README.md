# 📱 Cross-Platform Messenger

**Повнофункціональний кросплатформенний месенджер, натхненний Telegram**

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)](https://expo.dev/)

## ✨ Особливості

### 📱 Мобільний та Веб Додаток
- **Кросплатформенність**: Android, iOS (через Expo) та веб-браузери
- **Сучасний UI**: Темна тема, натхненна дизайном Telegram
- **Адаптивний дизайн**: Оптимізовано для всіх розмірів екранів
- **Smooth UX**: Плавні анімації та жести

### 💬 Функції Месенджера
- **Реєстрація за нікнеймом**: Унікальний нікнейм + опціональний телефон/email
- **Приватні чати**: Безпечне спілкування один-на-один
- **Групові чати**: Створення груп з декількома учасниками
- **Пошук контактів**: Знайти користувачів за нікнеймом або іменем
- **Обмін медіа**: Надсилання зображень та документів
- **Статуси повідомлень**: Індикатори "відправлено", "доставлено", "прочитано"
- **Лічильники непрочитаних**: Відстеження непрочитаних повідомлень

### 🔧 Технічні особливості
- **Real-time messaging**: WebSocket підтримка для миттєвого обміну
- **Безпека**: JWT автентифікація з bcrypt хешуванням паролів
- **База даних**: MongoDB з правильним індексуванням
- **API**: RESTful ендпоїнти з повною документацією
- **Файли**: Base64 кодування для кросплатформенної сумісності

## 🚀 Швидкий старт

### Опція 1: Docker (Рекомендовано)

```bash
# Клонуйте репозиторій
git clone <your-repo-url>
cd messenger-app

# Запустіть через Docker Compose
docker-compose up -d

# Додаток буде доступний на:
# - Веб: http://localhost:3000
# - API: http://localhost:8001
# - Документація API: http://localhost:8001/docs
```

### Опція 2: Ручне встановлення

#### Системні вимоги
- **Node.js** 18+ 
- **Python** 3.9+
- **MongoDB** 4.4+
- **Yarn** або npm

## 📦 Встановлення Backend (Сервер)

### 1. Встановлення MongoDB

#### Ubuntu/Debian:
```bash
# Імпорт ключа GPG
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Додавання репозиторію
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Встановлення
sudo apt update
sudo apt install -y mongodb-org

# Запуск
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### macOS:
```bash
# Через Homebrew
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb/brew/mongodb-community
```

#### Windows:
Завантажте та встановіть з [офіційного сайту MongoDB](https://www.mongodb.com/try/download/community)

### 2. Налаштування Backend

```bash
# Перейдіть до директорії backend
cd backend

# Створіть віртуальне середовище Python
python -m venv venv

# Активуйте віртуальне середовище
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Встановіть залежності
pip install -r requirements.txt

# Створіть файл конфігурації
cp .env.example .env
```

### 3. Налаштування .env файлу для Backend

Створіть файл `backend/.env`:

```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=messenger_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256

# Server Configuration
PORT=8001
HOST=0.0.0.0

# Environment
ENVIRONMENT=development
```

### 4. Запуск Backend

```bash
# В директорії backend
python server.py

# Або через uvicorn
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend буде доступний на `http://localhost:8001`
API документація: `http://localhost:8001/docs`

## 📱 Встановлення Frontend (Мобільний додаток)

### 1. Встановлення Expo CLI

```bash
npm install -g @expo/cli
```

### 2. Налаштування Frontend

```bash
# Перейдіть до директорії frontend
cd frontend

# Встановіть залежності
yarn install
# або
npm install

# Створіть файл конфігурації
cp .env.example .env
```

### 3. Налаштування .env файлу для Frontend

Створіть файл `frontend/.env`:

```env
# Backend API URL
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Expo Configuration
EXPO_USE_FAST_RESOLVER=1

# Development
EXPO_PUBLIC_ENV=development
```

**Важливо для продакшену:**
- Змініть `localhost:8001` на реальну адресу вашого сервера
- Використовуйте HTTPS для продакшену

### 4. Запуск Frontend

```bash
# В директорії frontend
yarn start
# або
npm start
```

### 5. Запуск на пристроях

#### Веб-браузер:
- Натисніть `w` в терміналі або відкрийте `http://localhost:3000`

#### Мобільний пристрій:
1. Встановіть додаток **Expo Go** з App Store або Google Play
2. Відскануйте QR-код з терміналу
3. Додаток завантажиться на вашому пристрої

#### Емулятор:
- Android: Натисніть `a` (потрібен Android Studio)
- iOS: Натисніть `i` (тільки на macOS з Xcode)

## 🐋 Docker Deployment

### Створення Docker Compose файлу

Створіть `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=messenger_db

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "8001:8001"
    depends_on:
      - mongodb
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=messenger_db
      - JWT_SECRET=your-production-secret-key
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

volumes:
  mongodb_data:
```

### Backend Dockerfile

Створіть `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Встановлення системних залежностей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копіювання та встановлення Python залежностей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіювання коду додатку
COPY . .

# Відкриття порту
EXPOSE 8001

# Запуск додатку
CMD ["python", "server.py"]
```

### Frontend Dockerfile

Створіть `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Встановлення Expo CLI
RUN npm install -g @expo/cli

# Копіювання package.json та yarn.lock
COPY package.json yarn.lock ./

# Встановлення залежностей
RUN yarn install --frozen-lockfile

# Копіювання коду додатку
COPY . .

# Відкриття порту
EXPOSE 3000

# Запуск додатку
CMD ["yarn", "web"]
```

## 🌐 Deployment на сервер

### 1. Підготовка сервера (Ubuntu)

```bash
# Оновлення системи
sudo apt update && sudo apt upgrade -y

# Встановлення Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Встановлення Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Встановлення Nginx
sudo apt install -y nginx

# Встановлення Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Налаштування Nginx

Створіть `/etc/nginx/sites-available/messenger`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активуйте конфігурацію:

```bash
sudo ln -s /etc/nginx/sites-available/messenger /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL сертифікат

```bash
sudo certbot --nginx -d your-domain.com
```

### 4. Deployment додатку

```bash
# Клонування репозиторію
git clone <your-repo-url> /opt/messenger
cd /opt/messenger

# Налаштування production .env файлів
# backend/.env
sudo tee backend/.env <<EOF
MONGO_URL=mongodb://mongodb:27017
DB_NAME=messenger_db
JWT_SECRET=$(openssl rand -hex 32)
ENVIRONMENT=production
EOF

# frontend/.env
sudo tee frontend/.env <<EOF
EXPO_PUBLIC_BACKEND_URL=https://your-domain.com
EXPO_PUBLIC_ENV=production
EOF

# Запуск через Docker Compose
docker-compose up -d

# Перевірка статусу
docker-compose ps
```

## 📱 Створення APK для Android

### 1. Налаштування Expo для білда

```bash
# В директорії frontend
npx expo install expo-build-properties

# Оновіть app.json
```

Додайте в `frontend/app.json`:

```json
{
  "expo": {
    "name": "Messenger",
    "slug": "messenger-app",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "android": {
      "package": "com.yourcompany.messenger",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      }
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.messenger",
      "buildNumber": "1.0.0"
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

### 2. Створення APK

```bash
# Встановіть EAS CLI
npm install -g @expo/eas-cli

# Логін в Expo
eas login

# Ініціалізація проекту
eas build:configure

# Створення APK для Android
eas build --platform android --profile preview

# Створення production білда
eas build --platform android --profile production
```

## 🔧 API Документація

### Основні ендпоїнти:

#### Автентифікація
- `POST /api/auth/register` - Реєстрація користувача
- `POST /api/auth/login` - Вхід користувача
- `GET /api/users/me` - Отримання профілю користувача
- `GET /api/users/search?q=query` - Пошук користувачів

#### Чати
- `GET /api/chats` - Отримання списку чатів
- `POST /api/chats` - Створення нового чату
- `GET /api/chats/{chat_id}/messages` - Отримання повідомлень
- `POST /api/chats/{chat_id}/messages` - Надсилання повідомлення
- `POST /api/chats/{chat_id}/upload` - Завантаження файлу

### Приклади запитів:

#### Реєстрація
```bash
curl -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "john_doe",
    "email": "john@example.com",
    "password": "securepassword",
    "display_name": "John Doe"
  }'
```

#### Створення групового чату
```bash
curl -X POST "http://localhost:8001/api/chats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "chat_type": "group",
    "name": "My Group",
    "participants": ["user_id_1", "user_id_2"]
  }'
```

## 🐛 Troubleshooting

### Поширені проблеми:

#### 1. Backend не запускається
```bash
# Перевірте, чи запущено MongoDB
sudo systemctl status mongod

# Перевірте логи backend
docker-compose logs backend
```

#### 2. Frontend не підключається до API
- Перевірте `EXPO_PUBLIC_BACKEND_URL` в `.env`
- Переконайтеся, що backend запущено на правильному порту
- Для мобільного пристрою використовуйте IP адресу, а не localhost

#### 3. Помилки CORS
- Переконайтеся, що CORS налаштовано в backend
- Перевірте, що frontend робить запити на правильний домен

#### 4. База даних недоступна
```bash
# Перевірка підключення до MongoDB
mongo --eval "db.adminCommand('ismaster')"

# Перевірка Docker контейнера
docker-compose exec mongodb mongo --eval "db.adminCommand('ismaster')"
```

### Логи для діагностики:

```bash
# Backend логи
docker-compose logs -f backend

# Frontend логи (в терміналі де запущено yarn start)
# Або в консолі браузера (F12)

# MongoDB логи
docker-compose logs -f mongodb

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 📊 Моніторинг та обслуговування

### 1. Backup бази даних

```bash
# Створення backup
docker-compose exec mongodb mongodump --db messenger_db --out /backup

# Відновлення з backup
docker-compose exec mongodb mongorestore --db messenger_db /backup/messenger_db
```

### 2. Оновлення додатку

```bash
# Зупинка сервісів
docker-compose down

# Отримання оновлень
git pull origin main

# Перебілд та запуск
docker-compose up -d --build
```

### 3. Масштабування

Для високого навантаження:

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  backend:
    deploy:
      replicas: 3
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
```

## 🤝 Сприяння проекту

1. Fork репозиторій
2. Створіть гілку для нової функції (`git checkout -b feature/AmazingFeature`)
3. Зафіксуйте зміни (`git commit -m 'Add some AmazingFeature'`)
4. Push до гілки (`git push origin feature/AmazingFeature`)
5. Відкрийте Pull Request

## 📝 Ліцензія

Цей проект має ліцензію MIT - дивіться файл [LICENSE](LICENSE) для деталей.

## 🙋‍♂️ Підтримка

- 📧 Email: support@yourdomain.com
- 💬 Telegram: @yourusername
- 🐛 Issues: [GitHub Issues](https://github.com/yourrepo/issues)

---

**Зроблено з ❤️ для спільноти розробників**
