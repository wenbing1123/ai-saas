export interface BaseRepository<T, CreateInput, Filter = Partial<T>> {
  list(filter?: Filter): Promise<T[]>;
  getById(id: string | number): Promise<T | null>;
  create(input: CreateInput): Promise<T>;
  update(id: string | number, patch: Partial<T>): Promise<T | null>;
  delete(id: string | number): Promise<boolean>;
}
