import { CouchNoteRepository } from "../repositories/CouchNoteRepository";
import { SyncService } from "../services/SyncService";
import { SyncController } from "../controllers/SyncController";

class Container {
	private noteRepository = new CouchNoteRepository();
	private syncService = new SyncService(this.noteRepository);
	public syncController = new SyncController(this.syncService);
}

export const container = new Container();
