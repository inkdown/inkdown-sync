import type { Note } from '../../src/types/note';
import type { CouchResponse, CouchBulkResponse } from '../../src/types/couch';

export class MockCouchDB {
  private documents: Map<string, Note> = new Map();
  private revisionCounter = 1;

  async get(id: string): Promise<Note> {
    const doc = this.documents.get(id);
    if (!doc) {
      throw new Error('Document not found');
    }
    return doc;
  }

  async put(id: string, doc: Note): Promise<CouchResponse> {
    const existingDoc = this.documents.get(id);
    const newRev = `${this.revisionCounter++}-${Math.random().toString(36).substr(2, 9)}`;
    
    const updatedDoc = {
      ...doc,
      _id: id,
      _rev: newRev,
    };

    this.documents.set(id, updatedDoc);

    return {
      ok: true,
      id: id,
      rev: newRev,
    };
  }

  async delete(id: string): Promise<CouchResponse> {
    const doc = this.documents.get(id);
    if (!doc) {
      throw new Error('Document not found');
    }

    this.documents.delete(id);

    return {
      ok: true,
      id: id,
      rev: doc._rev || '',
    };
  }

  async bulkDocs(docs: Note[]): Promise<CouchBulkResponse[]> {
    const results: CouchBulkResponse[] = [];

    for (const doc of docs) {
      try {
        const result = await this.put(doc._id, doc);
        results.push({
          ok: true,
          id: result.id,
          rev: result.rev,
        });
      } catch (error) {
        results.push({
          ok: false,
          id: doc._id,
          error: 'conflict',
          reason: 'Document update conflict',
        });
      }
    }

    return results;
  }

  async getAllDocs(): Promise<{ rows: Array<{ id: string; doc: Note }> }> {
    const rows = Array.from(this.documents.entries()).map(([id, doc]) => ({
      id,
      doc,
    }));

    return { rows };
  }

  clear() {
    this.documents.clear();
    this.revisionCounter = 1;
  }

  seed(notes: Note[]) {
    this.clear();
    for (const note of notes) {
      this.documents.set(note._id, note);
    }
  }
}