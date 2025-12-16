<template>
	<div class="tree-store-table">
		<ag-grid-vue
			:theme="themeQuartz"
			style="width: 100%; height: 100%;"
			:columnDefs="columnDefs"
			:rowData="rowData"
			:defaultColDef="defaultColDef"
			:treeData="true"
			:autoGroupColumnDef="autoGroupColumnDef"
			:getDataPath="getDataPath"
			:getRowId="getRowId"
      :gridOptions="gridOptions"
			@grid-ready="onGridReady"
			@model-updated="updateDisplayedIndexes"
			@row-group-opened="updateDisplayedIndexes"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import 'ag-grid-enterprise'
import { themeQuartz } from 'ag-grid-community'

import type {
	ColDef,
	GridApi,
	GridReadyEvent,
	GetRowIdParams,
	ICellRendererParams,
} from 'ag-grid-community'

import type { ID, TreeStore, TreeItem } from '../helpers/TreeStore'

interface Props {
	store: TreeStore<ID, TreeItem<ID>>
}

const props = defineProps<Props>()

interface RowData extends TreeItem<ID> {
	dataPath: string[]
	rowNumber: number
	category: 'Группа' | null
	__idx?: number
}

const gridApi = ref<GridApi<RowData> | null>(null)
const rowData = ref<RowData[]>([])

const gridOptions = {
  domLayout: 'autoHeight',
} as const

const defaultColDef: ColDef = {
	suppressHeaderMenuButton: true,
	suppressHeaderContextMenu: true,
	resizable: false,
	sortable: false,
	filter: false,
}

const autoGroupColumnDef = {
	headerName: '',
	width: 0,
	minWidth: 0,
	maxWidth: 0,
	cellRenderer: () => null,
}


const getDataPath = (data: RowData): string[] => data.dataPath

const getRowId = (params: GetRowIdParams<RowData>): string =>
	String(params.data.id)

// костыль) Если посидеть по дольше с либой, мб можно придумать что по круче
const categoryCellRenderer = (
	params: ICellRendererParams<RowData>,
) => {
	const e = document.createElement('div')
	e.style.display = 'flex'
	e.style.alignItems = 'center'
	e.style.gap = '8px'
	e.style.paddingLeft = `${params.node.level * 16}px`

	const isGroup = Boolean(
		params.node.childrenAfterGroup?.length,
	)

	const icon = document.createElement('span')
	icon.style.width = '16px'
	icon.style.userSelect = 'none'

	if (isGroup) {
		icon.style.cursor = 'pointer'
		icon.textContent = params.node.expanded ? '∨' : '›' // тут должны быть иконки, мб они есть в ag-grid но увы

		icon.onclick = (ev) => {
			ev.stopPropagation()
			params.node.setExpanded(!params.node.expanded)
			icon.textContent = params.node.expanded ? '∨' : '›'
		}
	}

	const label = document.createElement('span')
	label.textContent = isGroup ? 'Группа' : 'Элемент'
	label.style.fontWeight = isGroup ? '600' : '400'

	e.append(icon, label)
	return e
}

const columnDefs: ColDef<RowData>[] = [
	{
		headerName: '№ п/п',
		width: 80,
		field: '__idx', // Не уверен что надо было, но я заморочился
	},
	{
		headerName: 'Категория',
		field: 'category',
		width: 200,
		cellRenderer: categoryCellRenderer,
	},
	{
		headerName: 'Наименование',
		field: 'label',
		minWidth: 300,
		flex: 1,
    cellStyle: { textAlign: 'left' },
	},
]

const prepareRowData = (): RowData[] => {
	const allItems = props.store.getAll()
	const rootItems = allItems.filter(
		item => item.parent === null,
	)

	const result: RowData[] = []
	let rowNumber = 1

	const processItem = (
		item: TreeItem<ID>,
		parentPath: string[] = [],
	) => {
		const dataPath = [...parentPath, String(item.id)]
		const children = props.store.getChildren(item.id)

		result.push({
			...item,
			dataPath,
			rowNumber: rowNumber++,
			category: children.length > 0 ? 'Группа' : null,
		})

		for (const child of children) {
			processItem(child, dataPath)
		}
	}

	for (const item of rootItems) {
		processItem(item)
	}

	return result
}

const updateDisplayedIndexes = () => {
	if (!gridApi.value) return

	const api = gridApi.value
	const count = api.getDisplayedRowCount()

	for (let i = 0; i < count; i++) {
		const rowNode = api.getDisplayedRowAtIndex(i)
		if (!rowNode) continue

		rowNode.setDataValue('__idx', i + 1)
	}
}

const onGridReady = (params: GridReadyEvent<RowData>) => {
	gridApi.value = params.api
	rowData.value = prepareRowData()
}

onMounted(() => {
	rowData.value = prepareRowData()
})
</script>

<style scoped>
.tree-store-table {
	width: 100%;
}

:global(.ag-header-cell:not(:last-child):not(.ag-column-first)) {
	border-right: 1px solid #e5e7eb;
}
</style>