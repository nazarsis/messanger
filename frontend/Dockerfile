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