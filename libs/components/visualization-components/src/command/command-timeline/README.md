# Timeline

Command timeline displaying timeline for one trainee. Organizer is able to choose between displayed trainees.
Detail about particular commands is displayed along with time they were submitted.

## Usage

For Organizer view

```angular2html
<crczp-timeline [trainingInstanceId]="trainingInstanceId"/>
```

For Trainee view

```angular2html
<crczp-timeline [trainingInstanceId]="trainingInstanceId" [trainingRunId]="trainingRunId"/>
```
