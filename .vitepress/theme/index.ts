import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Layout from '../components/Layout/index.vue'
import '../styles/index.scss'

export default {
  extends: DefaultTheme,
  Layout: Layout,
}
