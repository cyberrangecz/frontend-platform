import {AgendaContainer} from '@sentinel/layout';
import {AgendaPortalLink} from './agenda-portal-link';

export class PortalAgendaContainer extends AgendaContainer {
    agendas: AgendaPortalLink[];
    displayed: boolean;
}
