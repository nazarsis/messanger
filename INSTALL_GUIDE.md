# 🚀 Швидкий гайд по встановленню месенджера

## ⚡ Як виправити проблему з Docker

### Проблема що виникла у вас:
```
error Your lockfile needs to be updated, but yarn was run with `--frozen-lockfile`.
```

### ✅ Рішення 1: Генерація правильного yarn.lock

У вашій папці `messanger/frontend` виконайте:

```bash
cd frontend

# Видаліть старий lockfile
rm -f yarn.lock

# Встановіть залежності заново
yarn install

# Тепер запустіть Docker
cd ..
docker-compose up -d --build
```

### ✅ Рішення 2: Локальний запуск (без Docker)

Якщо Docker все ще не працює, запустіть локально:

```bash
# 1. Встановіть MongoDB
sudo apt update
sudo apt install -y mongodb

# Запустіть MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Створіть .env файл
cp .env.example .env

# Запустіть backend
python server.py

# 3. Frontend (у новому терміналі)
cd frontend
yarn install
yarn start
```

### ✅ Рішення 3: Швидка Docker збірка

Якщо потрібен Docker, спробуйте цей варіант:

```bash
# Зупиніть існуючі контейнери
docker-compose down

# Очистіть кеш Docker
docker system prune -f

# Перебудуйте все
docker-compose up -d --build --force-recreate
```

## 🎯 Перевірка що працює

### Backend API:
```bash
curl -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "display_name": "Test User"
  }'
```

Має повернути JSON з токеном.

### Frontend:
Відкрийте http://localhost:3000 - має показати екран реєстрації.

### Мобільний додаток:
1. Встановіть **Expo Go** на телефон
2. Відскануйте QR код з терміналу
3. Додаток завантажиться на телефон

## 📱 Створення Android APK

```bash
# Встановіть EAS CLI
npm install -g @expo/eas-cli

# У папці frontend
cd frontend
eas login
eas build:configure
eas build --platform android --profile preview

# Завантажте APK з Expo dashboard
```

## 🐛 Якщо щось не працює

### 1. Проблеми з портами
```bash
# Перевірте які порти зайняті
sudo netstat -tulpn | grep :8001
sudo netstat -tulpn | grep :3000

# Зупиніть процеси якщо потрібно
sudo pkill -f "python server.py"
sudo pkill -f "yarn start"
```

### 2. Проблеми з MongoDB
```bash
# Перевірте статус
sudo systemctl status mongodb

# Перезапустіть
sudo systemctl restart mongodb

# Перевірте підключення
mongo --eval "db.adminCommand('ismaster')"
```

### 3. Проблеми з залежностями
```bash
# Backend
cd backend
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall

# Frontend
cd frontend
rm -rf node_modules
yarn install
```

## 📞 Контакти для підтримки

Якщо виникають проблеми:
1. Перевірте логи: `docker-compose logs -f`
2. Подивіться README.md для детальних інструкцій
3. Використовуйте локальний запуск як запасний варіант

**Успіхів з месенджером! 🎉**