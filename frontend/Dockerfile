FROM node:18-alpine

WORKDIR /app

# Встановлення Expo CLI
RUN npm install -g @expo/cli

# Копіювання package.json спочатку
COPY package.json ./

# Встановлення залежностей (без frozen lockfile для першого разу)
RUN yarn install

# Копіювання всього коду
COPY . .

# Відкриття порту
EXPOSE 3000

# Запуск додатку
CMD ["yarn", "web"]