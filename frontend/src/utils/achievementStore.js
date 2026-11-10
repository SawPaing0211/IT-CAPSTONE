// App-wide singleton wired to the real API client.
import { api } from '../api/client'
import { createAchievementStore } from './achievementNotifications'

export const achievementStore = createAchievementStore((path) => api.get(path))
