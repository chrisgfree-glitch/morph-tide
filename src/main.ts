import '@fontsource/silkscreen/latin-400.css'
import './style.css'
import { registerSW } from 'virtual:pwa-register'
import { mount } from './game'

registerSW({ immediate: true })
void mount()
