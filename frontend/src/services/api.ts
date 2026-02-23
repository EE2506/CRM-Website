import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            try {
                const refreshToken = useAuthStore.getState().refreshToken
                const response = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
                const { access_token } = response.data.data

                useAuthStore.setState({ accessToken: access_token })
                originalRequest.headers.Authorization = `Bearer ${access_token}`

                return api(originalRequest)
            } catch (err) {
                useAuthStore.getState().logout()
                window.location.href = '/login'
                return Promise.reject(err)
            }
        }
        return Promise.reject(error)
    }
)

export default api
