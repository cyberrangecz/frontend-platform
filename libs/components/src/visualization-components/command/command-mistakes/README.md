# Mistake component

Has two types of views, one for trainee and one for organizer.

### Organizer view

Organizer is able to filter between commands. Organizer also has possibility
to switch between wrong and correct commands. Another filter option is to
display only certain trainees.

### Trainee view

Trainee can only see his commands and by default see every mistake type he/she has done.

## Usage

For Organizer view

```angular2html
<crczp-mistake [trainingInstanceId]="trainingInstanceId"/>
```

For Trainee view

```angular2html
<crczp-mistake [trainingInstanceId]="trainingInstanceId" [trainingRunId]="trainingRunId"/>
```
