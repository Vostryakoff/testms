import { describe, it, expect } from 'vitest'
import { TreeStore, type TreeItem } from '../src/helpers/TreeStore'

describe('TreeStore', () => {
	it('с базовой структурой данных', () => {
		const testData: TreeItem[] = [
			{ id: 1, parent: null, label: 'Айтем 1' },

			{ id: '91064cee', parent: 1, label: 'Айтем 2' },
			{ id: 3, parent: 1, label: 'Айтем 3' },

			{ id: 4, parent: '91064cee', label: 'Айтем 4' },
			{ id: 5, parent: '91064cee', label: 'Айтем 5' },
			{ id: 6, parent: '91064cee', label: 'Айтем 6' },

			{ id: 7, parent: 4, label: 'Айтем 7' },
			{ id: 8, parent: 4, label: 'Айтем 8' },
		]

		const store = new TreeStore<TreeItem>(testData)

		// Проверяем получение всех элементов
		expect(store.getAll()).toHaveLength(8)

		// Проверяем получение корневого элемента
		const rootItem = store.getItem(1)
		expect(rootItem).toBeDefined()
		expect(rootItem?.label).toBe('Айтем 1')
		expect(rootItem?.parent).toBeNull()

		// Проверяем получение прямых детей корневого элемента
		const rootChildren = store.getChildren(1)
		expect(rootChildren).toHaveLength(2)
		expect(rootChildren.map(c => c.id)).toContain('91064cee')
		expect(rootChildren.map(c => c.id)).toContain(3)

		// Проверяем получение всех потомков (включая вложенные)
		const allRootChildren = store.getAllChildren(1)
		expect(allRootChildren).toHaveLength(7) // все кроме корня

		// Проверяем получение всех потомков для элемента '91064cee'
		const nestedChildren = store.getAllChildren('91064cee')
		expect(nestedChildren).toHaveLength(5) // 4, 5, 6, 7, 8

		// Проверяем получение родителей для вложенного элемента
		const parents = store.getAllParents(7)
		expect(parents).toHaveLength(3) // 4, '91064cee', 1
		expect(parents[0].id).toBe(4)
		expect(parents[1].id).toBe('91064cee')
		expect(parents[2].id).toBe(1)
	})

	it('время выполнения на дереве из 100 элементов', () => {
		const ITEMS_COUNT = 100000

		const testData: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
		]

		for (let i = 2; i <= ITEMS_COUNT; i++) {
			const parentId =
				testData[Math.floor(Math.random() * testData.length)].id

			testData.push({
				id: i,
				parent: parentId,
				label: `Item ${i}`,
			})
		}

		console.time('TreeStore init')
		const store = new TreeStore<TreeItem>(testData)
		console.timeEnd('TreeStore init')

		console.time('getAll')
		const all = store.getAll()
		console.timeEnd('getAll')

		const randomId = Math.floor(Math.random() * ITEMS_COUNT) + 1

		console.time('getChildren')
		store.getChildren(randomId)
		console.timeEnd('getChildren')

		console.time('getAllChildren')
		store.getAllChildren(randomId)
		console.timeEnd('getAllChildren')

		console.time('getAllParents')
		store.getAllParents(randomId)
		console.timeEnd('getAllParents')

		expect(all).toHaveLength(ITEMS_COUNT)
	})

	// Да это чат!!!, я сам такое хрен придумаю
	it('обрабатывает все попытки сломать структуру', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child 1' },
			{ id: 3, parent: 2, label: 'Child 2' },
			{ id: 4, parent: 3, label: 'Child 3' },
		]

		const store = new TreeStore(data)

		/* ------------------ duplicate id ------------------ */

		expect(() => {
			store.addItem({ id: 2, parent: 1, label: 'Duplicate' })
		}).toThrow(/already exists/i)

		/* ------------------ self parent ------------------ */

		expect(() => {
			store.updateItem({
				id: 2,
				parent: 2,
				label: 'Self parent',
			})
		}).toThrow(/parent of itself/i)

		/* ------------------ circular dependency ------------------ */
		// 1 -> 2 -> 3 -> 4
		// пробуем сделать 1 дочерним 4

		expect(() => {
			store.updateItem({
				id: 1,
				parent: 4,
				label: 'Cycle',
			})
		}).toThrow(/circular/i)

		/* ------------------ update non-existing item ------------------ */

		expect(() => {
			store.updateItem({
				id: 999,
				parent: null,
				label: 'Ghost',
			})
		}).not.toThrow()

		expect(store.getItem(999)).toBeUndefined()

		/* ------------------ cache invalidation ------------------ */

		// прогреваем кеш
		const childrenBefore = store.getAllChildren(1)
		expect(childrenBefore.map(i => i.id)).toEqual([2, 3, 4])

		// меняем родителя
		store.updateItem({
			id: 3,
			parent: 1,
			label: 'Moved',
		})

		const childrenAfter = store.getAllChildren(1)
		expect(childrenAfter.map(i => i.id).sort()).toEqual([2, 3, 4])

		/* ------------------ remove subtree ------------------ */

		store.removeItem(2)

		expect(store.getItem(2)).toBeUndefined()

		expect(store.getItem(3)).toBeDefined()
		expect(store.getItem(4)).toBeDefined()
		
		expect(store.getAllParents(3).map(p => p.id)).toEqual([1])
		expect(store.getAllParents(4).map(p => p.id)).toEqual([3, 1])

		/* ------------------ stability ------------------ */

		expect(() => store.getAll()).not.toThrow()
		expect(() => store.getAllChildren(1)).not.toThrow()
		expect(() => store.getAllParents(1)).not.toThrow()
	})

	it('getAll возвращает изначальный массив элементов', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child' },
		]

		const store = new TreeStore(data)

		const all = store.getAll()

		expect(all).toBe(data)

		expect(all).toHaveLength(2)
		expect(all[0]).toBe(data[0])
		expect(all[1]).toBe(data[1])
	})

	it('getItem возвращает объект элемента по id', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child' },
		]

		const store = new TreeStore(data)

		const item = store.getItem(2)

		// возвращается именно тот же объект
		expect(item).toBe(data[1])
		expect(item?.id).toBe(2)
		expect(item?.label).toBe('Child')
	})

	it('getItem возвращает undefined, если элемент не найден', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
		]

		const store = new TreeStore(data)

		expect(store.getItem(999)).toBeUndefined()
	})
	it('getChildren(id) возвращает дочерние элементы или пустой массив', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child 1' },
			{ id: 3, parent: 1, label: 'Child 2' },
			{ id: 4, parent: 2, label: 'Nested' },
		]
	
		const store = new TreeStore(data)
	
		const children = store.getChildren(1)
	
		expect(children.map(i => i.id)).toEqual(
			expect.arrayContaining([2, 3]),
		)
		expect(children).toHaveLength(2)
	
		expect(store.getChildren(2).map(i => i.id)).toEqual(
			expect.arrayContaining([4]),
		)
	
		expect(store.getChildren(4)).toEqual([])
	})
	it('getAllChildren(id) возвращает всех потомков элемента на всех уровнях', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
			{ id: 2, parent: 1, label: 'Child 1' },
			{ id: 3, parent: 1, label: 'Child 2' },
			{ id: 4, parent: 2, label: 'Nested 1' },
			{ id: 5, parent: 4, label: 'Nested 2' },
		]
	
		const store = new TreeStore(data)
	
		const allChildren = store.getAllChildren(1)
	
		expect(allChildren.map(i => i.id)).toEqual(
			expect.arrayContaining([2, 3, 4, 5]),
		)
		expect(allChildren).toHaveLength(4)
	
		expect(store.getAllChildren(2).map(i => i.id)).toEqual(
			expect.arrayContaining([4, 5]),
		)
	
		expect(store.getAllChildren(5)).toEqual([])
	})

	it('getAllParents(id) возвращает полный путь к корню в правильном порядке', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
	
			{ id: 2, parent: 1, label: 'Level 1 - A' },
			{ id: 3, parent: 2, label: 'Level 2 - A' },
			{ id: 4, parent: 3, label: 'Level 3 - A' },
			{ id: 5, parent: 4, label: 'Level 4 - A' },
	
			{ id: 6, parent: 1, label: 'Level 1 - B' },
			{ id: 7, parent: 6, label: 'Level 2 - B' },
		]
	
		const store = new TreeStore(data)
	
		const parents = store.getAllParents(5)
	
		expect(parents.map(i => i.id)).toEqual([4, 3, 2, 1])
	
		expect(store.getAllParents(3).map(i => i.id)).toEqual([2, 1])
	
		expect(store.getAllParents(1)).toEqual([])
	})

	it('removeItem(id) удаляет элемент и всё его поддерево', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
	
			{ id: 2, parent: 1, label: 'Level 1 - A' },
			{ id: 3, parent: 2, label: 'Level 2 - A' },
			{ id: 4, parent: 3, label: 'Level 3 - A' },
	
			{ id: 5, parent: 1, label: 'Level 1 - B' },
			{ id: 6, parent: 5, label: 'Level 2 - B' },
		]
	
		const store = new TreeStore(data)
	
		store.removeItem(2)
	
		expect(store.getItem(2)).toBeUndefined()
		expect(store.getItem(3)).toBeUndefined()
		expect(store.getItem(4)).toBeUndefined()
	
		expect(store.getItem(5)).toBeDefined()
		expect(store.getItem(6)).toBeDefined()
	
		expect(store.getChildren(1).map(i => i.id)).toEqual([5])
	
		expect(store.getAll().map(i => i.id)).toEqual(
			expect.arrayContaining([1, 5, 6]),
		)
	})

	it('updateItem({...}) обновляет данные элемента и структуру дерева', () => {
		const data: TreeItem[] = [
			{ id: 1, parent: null, label: 'Root' },
	
			{ id: 2, parent: 1, label: 'Level 1 - A' },
			{ id: 3, parent: 2, label: 'Level 2 - A' },
	
			{ id: 4, parent: 1, label: 'Level 1 - B' },
		]
	
		const store = new TreeStore(data)
	
		store.updateItem({
			id: 2,
			parent: 1,
			label: 'Level 1 - A (updated)',
		})
	
		expect(store.getItem(2)?.label).toBe('Level 1 - A (updated)')
		expect(store.getChildren(1).map(i => i.id)).toEqual(
			expect.arrayContaining([2, 4]),
		)
	
		store.updateItem({
			id: 3,
			parent: 1,
			label: 'Level 2 - A (moved)',
		})
	
		expect(store.getAllParents(3).map(i => i.id)).toEqual([1])
		expect(store.getChildren(2)).toEqual([])
		expect(store.getChildren(1).map(i => i.id)).toEqual(
			expect.arrayContaining([2, 3, 4]),
		)
	})
})
