import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';

interface ITranslateFile {
  id: string;
  mode: string;
  kind: string;
  label: string;
  language: string;
}

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss']
})
export class VideoComponent {
  wasPaused = null;
  subtitles: ITranslateFile[] = [];
  
  timeSkip: number = 10;
  playbackRate: number = 1;

  totalTime: string = "";
  videoProgress: string = "";
  volumeLevel: string = "high";
  currentTime: string = "0:00";
  currentLabel: string = "off";
  currentTimeline: string = "";

  isPlay: boolean = false;
  isIntro: boolean = true;
  forward: boolean = false;
  backward: boolean = false;
  isScrubbing: boolean = false;
  toggleControls: boolean = false;
  showProgressInfo: boolean = false;

  @Input() video: string = "";
  @Input() title: string = "";
  @Input() progress: number = 80;
  @Output() timelineAlert: EventEmitter<boolean> = new EventEmitter(false);

  @ViewChild('video') videoPlayer!: ElementRef;
  @ViewChild('volumeSlider') volumeSlider!: ElementRef;
  @ViewChild('videoContainer') videoContainer!: ElementRef;
  @ViewChild('timelineContainer') timelineContainer!: ElementRef;
  
  leadingZeroFormatter = new Intl.NumberFormat(undefined, {minimumIntegerDigits: 2});

  // Document Events
  @HostListener('window:keydown', ['$event'])
  actionsVideo(event: any): void {
    const tagName = document.activeElement?.tagName.toLowerCase();
    if(tagName === "input") return;
    switch (event.key.toLocaleLowerCase()) {
      case " ":
      case "k":
        if(tagName === "button") return;
        this.togglePlay();
        break;
      case "f":
        this.toggleFullScreenMode();
        break;
      case "m":
        this.toggleMute();
        break;
      case "arrowleft":
      case "j":
        this.backward = true;
        this.skip(-this.timeSkip);
        break;
      case "arrowright":
      case "l":
        this.forward = true;
        this.skip(+this.timeSkip);
        break;
    }
  }

  // Pause | Play
  togglePlay(): void {
    this.isIntro = false;
    this.videoPlayer.nativeElement.paused ? this.videoPlayer.nativeElement.play() : this.videoPlayer.nativeElement.pause();
  }

  // Full Screen Mode
  toggleFullScreenMode(): void {
    if(document.fullscreenElement === null){
      this.videoContainer.nativeElement.requestFullscreen();
    } else document.exitFullscreen();
  }

  @HostListener('window:fullscreenchange', ['$event'])
  fullscreenchange(): void {
    this.videoContainer.nativeElement.classList.toggle("full-screen", document.fullscreenElement);
  }

  // Volume
  toggleMute(): void {
    this.videoPlayer.nativeElement.muted = !this.videoPlayer.nativeElement.muted;
  }

  slideVolume(): void {
    this.videoPlayer.nativeElement.volume = this.volumeSlider.nativeElement.value;
    this.videoPlayer.nativeElement.muted = this.volumeSlider.nativeElement.value === 0;
  }

  changeVolume(): void {
    this.volumeSlider.nativeElement.value = this.videoPlayer.nativeElement.volume;
    if(this.videoPlayer.nativeElement.muted || this.videoPlayer.nativeElement.volume === 0){
      this.volumeSlider.nativeElement.value = 0;
      this.volumeLevel = "muted";
    } else if(this.videoPlayer.nativeElement.volume >= .5) this.volumeLevel = "high";
    else this.volumeLevel = "low";
    this.videoContainer.nativeElement.dataset.volumeLevel = this.volumeLevel;
  }

  // Playback
  changePlaybackSpeed(rate: number): void {
    this.videoPlayer.nativeElement.playbackRate = rate;
    this.playbackRate = rate;
  }

  // Duration
  loadedVideo(): void {
    let videoSrc: string = this.videoPlayer?.nativeElement.currentSrc?.split("/").slice(-1).join("");
    this.title = videoSrc?.split(".")[0];
    this.totalTime = this.formatDuration(this.videoPlayer.nativeElement.duration);
  }
  
  updateDuration(): void {
    const percent = this.videoPlayer.nativeElement.currentTime / this.videoPlayer.nativeElement.duration;
    this.currentTime = this.formatDuration(this.videoPlayer.nativeElement.currentTime);
    this.timelineContainer.nativeElement.style.setProperty("--progress-position", percent);
    this.videoProgress = (percent * 100).toFixed(1);
    this.toggleProgressAlert()
  }

  toggleProgressAlert(): void {
    if(this.progress === +this.videoProgress){
      this.timelineAlert.emit(true);
      this.toggleControls = true;
      this.showProgressInfo = true;
      setTimeout(() => {
        this.showProgressInfo = false;
        this.toggleControls = false;
        this.timelineAlert.emit(false);
      }, 5000);
    }
  }

  formatDuration(time: number): string {
    const seconds = Math.floor(time % 60);
    const minutes = Math.floor(time / 60) % 60;
    const hours = Math.floor(time / 3600);
    if(hours === 0) return `${minutes}:${this.leadingZeroFormatter.format(seconds)}`;
    else return `${hours}:${this.leadingZeroFormatter.format(minutes)}:${this.leadingZeroFormatter.format(seconds)}`;
  }

  skip(duration: number): void {
    this.videoPlayer.nativeElement.currentTime += duration;
    setTimeout(() => {
      this.forward = false;
      this.backward = false;
    }, 1000);
  }

  // Caption
  loadCaptions(): void {
    this.subtitles = this.videoPlayer.nativeElement.textTracks;
    for (let i = 0; i < this.subtitles.length; i++) {
      this.subtitles[i].mode = "hidden";
    }
  }

  getCaptions(label: string): void {
    if(!label) return;
    for (let i = 0; i < this.subtitles.length; i++) {
      if(label === "off"){
        this.subtitles[i].mode = "hidden";
        this.currentLabel = "off";
      } else if(this.subtitles[i].label === label){
        this.subtitles[i].mode = "showing"
        this.currentLabel = label;
      } else {
        this.subtitles[i].mode = "hidden";
      }
    }
  }

  // Timeline
  handleTimelineUpdate(event: any): void {
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const percent: number = Math.min(Math.max(0, event.x - rect.x), rect.width) / rect.width;
    this.timelineContainer.nativeElement.style.setProperty("--preview-position", percent);
    this.currentTimeline = this.formatDuration(percent * this.videoPlayer.nativeElement.duration);
    if(this.isScrubbing){
      event.preventDefault();
      this.timelineContainer.nativeElement.style.setProperty("--progress-position", percent);
    }
  }

  toggleScrubbing(event: any): void {
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const percent = Math.min(Math.max(0, event.x - rect.x), rect.width) / rect.width;
    this.isScrubbing = (event.buttons & 1) === 1;
    this.videoContainer.nativeElement.classList.toggle("scrubbing", this.isScrubbing);
    if(this.isScrubbing){
      this.wasPaused = this.videoPlayer.nativeElement.paused;
      this.videoPlayer.nativeElement.pause();
    } else {
      this.videoPlayer.nativeElement.currentTime = percent * this.videoPlayer.nativeElement.duration;
      if(!this.wasPaused) this.videoPlayer.nativeElement.play();
    }
    this.handleTimelineUpdate(event);
  }

  @HostListener('window:mouseup', ['$event'])
  updateScrubbing(event: any): void {
    if(this.isScrubbing) this.toggleScrubbing(event);
  }

  @HostListener('window:mousemove', ['$event'])
  updateTimeline(event: any): void {
    if(this.isScrubbing) this.handleTimelineUpdate(event);
  }

  showHideControls() {
    this.toggleControls = !this.toggleControls;
  }

  bufferedVideo(): void {
    if(!this.videoPlayer.nativeElement) return;
    let timeLoaded = 0;
    let timeTotal = 0;
    if( timeTotal == 0 ) timeTotal = this.videoPlayer.nativeElement.duration;
    if (this.videoPlayer.nativeElement.buffered.length === 1) {
      timeLoaded = this.videoPlayer.nativeElement.buffered.end(0);
      this.timelineContainer.nativeElement.style.display = "block";
      this.timelineContainer.nativeElement.style.setProperty("--preview-position", (timeLoaded / timeTotal));
    }
  }

  // Download
  downloadVideo(): void {
    const link = document.createElement('a');
    link.href = this.videoPlayer.nativeElement.currentSrc;
    link.download = this.title;
    link.target = "_blank";
    link.click();
  }
}
