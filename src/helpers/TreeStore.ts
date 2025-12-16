export type ID = string | number

export interface TreeItem<IDType extends ID = ID> {
	id: IDType
	parent: IDType | null
	label: string
}

export class TreeStore<
	IDType extends ID,
	T extends TreeItem<IDType>
> {
	private items: T[]
	private itemMap = new Map<IDType, T>()
	private childrenMap = new Map<IDType | null, Set<IDType>>()

	// кеш для реальных id (без null)
	private allChildrenCache = new Map<IDType, T[]>()

	constructor(items: T[]) {
		// this.items = [...items] // защищаем от мутаций??
		this.items = items

		for (const item of items) {
			this.itemMap.set(item.id, item)

			if (!this.childrenMap.has(item.parent)) {
				this.childrenMap.set(item.parent, new Set())
			}

			this.childrenMap.get(item.parent)!.add(item.id)
		}
	}

	private invalidateAllChildrenCacheFrom(
		id: IDType | null,
	): void {
		let current: IDType | null = id

		while (current !== null) {
			this.allChildrenCache.delete(current)
			current = this.itemMap.get(current)?.parent ?? null
		}
	}

	private assertNoCircularDependency(
		id: IDType,
		newParent: IDType | null,
	): void {
		if (newParent === null) return
		if (newParent === id) {
			throw new Error('Item cannot be parent of itself')
		}

		const children = this.getAllChildren(id)
		if (children.some(child => child.id === newParent)) {
			throw new Error(
				`Circular dependency detected for id ${String(id)}`,
			)
		}
	}

	getAll(): readonly T[] {
		return this.items
	}

	getItem(id: IDType): T | undefined {
		return this.itemMap.get(id)
	}

	getChildren(id: IDType): T[] {
		const childIds = this.childrenMap.get(id)
		if (!childIds) return []

		const result: T[] = []
		for (const childId of childIds) {
			const item = this.itemMap.get(childId)
			if (item) result.push(item)
		}

		return result
	}

	getAllChildren(id: IDType): T[] {
		const cached = this.allChildrenCache.get(id)
		if (cached) return cached

		const result: T[] = []
		const stack: IDType[] = []

		const firstChildren = this.childrenMap.get(id)
		if (firstChildren) {
			for (const childId of firstChildren) stack.push(childId)
		}

		while (stack.length) {
			const currentId = stack.pop()!
			const item = this.itemMap.get(currentId)
			if (!item) continue

			result.push(item)

			const children = this.childrenMap.get(currentId)
			if (children) {
				for (const childId of children) {
					stack.push(childId)
				}
			}
		}

		this.allChildrenCache.set(id, result)
		return result
	}

	getAllParents(id: IDType): T[] {
		const result: T[] = []
		let current = this.itemMap.get(id)?.parent

		while (current !== null && current !== undefined) {
			const item = this.itemMap.get(current)
			if (!item) break

			result.push(item)
			current = item.parent
		}

		return result
	}

	/* ------------------------ mutations ------------------------ */

	addItem(item: T): void {
		if (this.itemMap.has(item.id)) {
			throw new Error(
				`Item with id ${String(item.id)} already exists`,
			)
		}

		this.items.push(item)
		this.itemMap.set(item.id, item)

		if (!this.childrenMap.has(item.parent)) {
			this.childrenMap.set(item.parent, new Set())
		}
		this.childrenMap.get(item.parent)!.add(item.id)

		this.invalidateAllChildrenCacheFrom(item.parent)
	}

	updateItem(updated: T): void {
		const existing = this.itemMap.get(updated.id)
		if (!existing) return

		const oldParent = existing.parent
		const newParent = updated.parent

		if (oldParent !== newParent) {
			this.assertNoCircularDependency(updated.id, newParent)

			this.childrenMap.get(oldParent)?.delete(existing.id)

			if (!this.childrenMap.has(newParent)) {
				this.childrenMap.set(newParent, new Set())
			}
			this.childrenMap.get(newParent)!.add(existing.id)

			this.invalidateAllChildrenCacheFrom(oldParent)
			this.invalidateAllChildrenCacheFrom(newParent)
		} else {
			this.invalidateAllChildrenCacheFrom(existing.id)
		}

		Object.assign(existing, updated)
	}

	removeItem(id: IDType): void {
		const root = this.itemMap.get(id)
		if (!root) return

		const toRemove = new Set<IDType>()
		const stack: IDType[] = [id]

		while (stack.length) {
			const currentId = stack.pop()!
			if (toRemove.has(currentId)) continue

			toRemove.add(currentId)

			const children = this.childrenMap.get(currentId)
			if (children) {
				for (const childId of children) {
					stack.push(childId)
				}
			}
		}

		for (const removeId of toRemove) {
			const item = this.itemMap.get(removeId)
			if (!item) continue

			this.childrenMap.get(item.parent)?.delete(removeId)
			this.childrenMap.delete(removeId)
			this.itemMap.delete(removeId)
			this.allChildrenCache.delete(removeId)
		}

		this.items = this.items.filter(
			item => !toRemove.has(item.id),
		)

		this.invalidateAllChildrenCacheFrom(id)
	}
}