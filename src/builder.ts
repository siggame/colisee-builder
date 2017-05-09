import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import * as _ from 'lodash';

type StatusState = 'queued' | 'building' | 'finished';
export interface Status {
    state: StatusState;
    queued_time: number;
    building_time: number | null;
    finished_time: number | null;
}
interface StatusMap {
    [id: number]: Status;
}

const ZIP_DIR: string = path.join(__dirname, "../tmp/zips");
const FOLDERS_DIR: string = path.join(__dirname, "../tmp/folders");
const OUTPUT_DIR: string = path.join(__dirname, "../tmp/output");
const IMAGES_DIR: string = path.join(__dirname, "../tmp/images");

export class Builder {
    private BUILDING_LIMIT: number;
    private POLL_INTERVAL: number;
    private MAX_FINISHED: number;
    
    private last_id: number;
    
    private queued_ids: number[];
    private building_ids: number[];
    private finished_ids: number[];
    
    private id_status: StatusMap = {};
    
    constructor() {
    }
    
    run(): Promise<void> {
        const startPolling = (): void => {
            setInterval(()=>{
                this.poll()
            }, this.POLL_INTERVAL);
        }
        
        const resetFolders = ()=>{
            //TODO: reset zip, images, output, and folder directories
        }
        
        return Promise.resolve()
            .then(resetFolders)
            .then(startPolling);
    }
    
    
    zip(id: number): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject)=>{
            const p = path.join(ZIP_DIR, `${id}.zip`);
            fs.readFile(p, (err, file) => {
                if(err) return reject(err);
                resolve(file);
            });
        });
    }
    output(id: number): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject)=>{
            const p = path.join(OUTPUT_DIR, `${id}.txt`);
            fs.readFile(p, (err, file) => {
                if(err) return reject(err);
                resolve(file);
            });
        });
    }
    image(id: number): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject)=>{
            const p = path.join(IMAGES_DIR, `${id}.zip`);
            fs.readFile(p, (err, file) => {
                if(err) return reject(err);
                resolve(file);
            });
        });
    }
    status(id: number): Promise<Status> {
        return Promise.resolve(this.status[id]);
    }
    

    private enqueue(zip: Buffer): Promise<number> {
        return Promise<number>((resolve, reject)=>{
            this.last_id++;
            const current_id = this.last_id;
            
            // Save zip to disk as id (zips/1234.zip)
            fs.writeFileSync(path.join(ZIP_DIR, `${current_id}.zip`))
            
            //TODO: Unzip to folder (folders/1234/)
            
            // Set status to queued
            this.id_status[current_id] = {
                state: 'queued',
                queued_time: Date.now(),
                building_time: null,
                finished_time: null,
            };
            
            this.building_ids.push(current_id);
            return resolve(current_id);
        });
    }
    
    private poll() {
        // Don't build now if building limit reached
        if(this.building_ids.length >= this.BUILDING_LIMIT) {
            return;
        }
        
        const to_build: number = this.queued_ids.shift();
        this.building_ids.push(to_build);
        
        // Update status to building
        this.id_status[to_build].state = 'building';
        this.id_status[to_build].building_time = Date.now();
        
        //TODO: Build image with docker (docker build --tag image_1234 folders/1234)
        //TODO: Save build output (output/1234.txt)
        //TODO: Save docker image as zip (images/1234.zip)
        
        // Update status to finished
        this.id_status[to_build].state = 'finished';
        this.id_status[to_build].finished_time = Date.now();
        
        // Move from building_ids to finished_ids
        _.pull(this.building_ids, to_build);
        this.finished_ids.push(to_build);
        
        // Delete oldest finished_id if too many saved
        if(this.finished_ids.length > this.MAX_FINISHED) {
            const to_remove: number = this.finished_ids.shift();
            this.delete_id(to_remove);
        }
    }
    
    private delete_id(id: number): Promise<void> {
        //TODO: Delete original zip (zips/1234.zip)
        //TODO: Delete folder 
        //TODO: Remove from status
        
        return Promise.resolve();
    }
    

}