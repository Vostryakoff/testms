import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TreeStoreTable from '../src/components/TreeStoreTable.vue'
import { TreeStore, type TreeItem } from '../src/helpers/TreeStore'

// Предполагаю что у компонента AgGridVue итак хорошее покрытие раз оно даже за деньги) Мокаем и проверяем контракты и логику
vi.mock('ag-grid-vue3', () => ({
	AgGridVue: {
		name: 'AgGridVue',
		props: {
			columnDefs: Array,
			rowData: Array,
			treeData: Boolean,
			getDataPath: Function,
			getRowId: Function,
			autoGroupColumnDef: Object,
			defaultColDef: Object,
			gridOptions: Object,
		},
		template: '<div class="ag-grid-mock"></div>',
	},
}))

vi.mock('ag-grid-enterprise', () => ({}))

describe('TreeStoreTable', () => {
	it('должен существовать и монтироваться без ошибок', () => {
		const testData: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child' },
		]

		const store = new TreeStore<TreeItem>(testData)

		const wrapper = mount(TreeStoreTable, {
			props: {
				store,
			},
		})

		expect(wrapper.exists()).toBe(true)
		expect(wrapper.find('.tree-store-table').exists()).toBe(true)
	})

	it('корректно пробрасываются props в grid', () => {
		const testData: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child' },
		]

		const store = new TreeStore<TreeItem>(testData)

		const wrapper = mount(TreeStoreTable, {
			props: {
				store,
			},
		})

		const gridComponent = wrapper.findComponent({ name: 'AgGridVue' })

		expect(gridComponent.exists()).toBe(true)

		expect(gridComponent.props('treeData')).toBe(true)
		expect(gridComponent.props('columnDefs')).toBeDefined()
		expect(Array.isArray(gridComponent.props('columnDefs'))).toBe(true)
		expect(gridComponent.props('defaultColDef')).toBeDefined()
		expect(gridComponent.props('autoGroupColumnDef')).toBeDefined()
		expect(gridComponent.props('getDataPath')).toBeDefined()
		expect(typeof gridComponent.props('getDataPath')).toBe('function')
		expect(gridComponent.props('getRowId')).toBeDefined()
		expect(typeof gridComponent.props('getRowId')).toBe('function')
		expect(gridComponent.props('gridOptions')).toBeDefined()
		expect(gridComponent.props('gridOptions').domLayout).toBe('autoHeight')
	})

	it('корректно подготавливает rowData', async () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child' },
		]
	
		const store = new TreeStore(data)
	
		const wrapper = mount(TreeStoreTable, { props: { store } })
	
		const rows = (wrapper.vm as any).rowData
	
		expect(rows).toHaveLength(2)
		expect(rows[0].dataPath).toEqual(['1'])
		expect(rows[1].dataPath).toEqual(['1', '2'])
		expect(rows[0].category).toBe('Группа')
		expect(rows[1].category).toBe(null)
	})
	// можно еще мелкие функции по тестить но это наверно все выносится в хелперы и тестятся не в рамках этого компонента
})
