import { createApp } from 'vue'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
// @ts-ignore - AllEnterpriseModule exists but types may not be exported
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import './style.css'
import App from './App.vue'

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

createApp(App).mount('#app')
