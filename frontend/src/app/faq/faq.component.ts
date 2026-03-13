import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css'
})
export class FaqComponent {
  openId: string | null = null;
  activeCategory = 'rezervacije';

  toggle(id: string) {
    this.openId = this.openId === id ? null : id;
  }

  faqs: any = {
    rezervacije: [
      {
        id: 'r1',
        q: 'Kako da rezervišem teren?',
        a: 'Pronađi teren koji ti odgovara, odaberi datum i slobodan termin, klikni "Rezerviši" i potvrdi. Odmah ćeš dobiti potvrdu na email sa svim detaljima termina.'
      },
      {
        id: 'r2',
        q: 'Mogu li rezervisati više termina odjednom?',
        a: 'Trenutno je moguće rezervisati jedan termin po transakciji. Za ponavljajuće termine (npr. svake sedmice), kontaktiraj vlasnika terena direktno — većina vlasnika nudi dogovor za stalne korisnike.'
      },
      {
        id: 'r3',
        q: 'Kako da znam da li je termin slobodan?',
        a: 'Na stranici svakog terena vidljivi su dostupni termini u realnom vremenu. Zauzeti termini su sivi, slobodni zeleni. Dostupnost se ažurira odmah nakon svake rezervacije.'
      },
      {
        id: 'r4',
        q: 'Dobijam li potvrdu rezervacije?',
        a: 'Da — odmah po rezervaciji šaljemo ti email sa svim detaljima: naziv terena, adresa, datum, vreme i iznos. Istu potvrdu možeš pronaći u sekciji <strong>Moje rezervacije</strong>.'
      },
      {
        id: 'r5',
        q: 'Mogu li rezervisati teren za nekoga drugog?',
        a: 'Da, možeš rezervisati teren koristeći sopstveni nalog u ime drugog igrača. Samo se pobrinite da onaj ko dolazi na teren zna detalje rezervacije.'
      }
    ],
    placanje: [
      {
        id: 'p1',
        q: 'Kako se vrši plaćanje?',
        a: 'Plaćanje se vrši <strong>gotovinom direktno na terenu</strong> u trenutku dolaska. Platforma za sada ne naplaćuje online — rezervacija samo osigurava tvoje mesto, a iznos plaćaš vlasniku terena lično.'
      },
      {
        id: 'p2',
        q: 'Da li postoje skrivene naknade ili provizije?',
        a: '<strong>Ne.</strong> Cena prikazana na terenu je konačna cena koju plaćaš. SportskiTermin je besplatan za korisnike — ne naplaćujemo nikakvu proviziju ni naknadu za rezervaciju.'
      },
      {
        id: 'p3',
        q: 'Šta znači cena "po terminu"?',
        a: 'Svaki teren ima definisano trajanje jednog termina (npr. 60 ili 90 minuta). Prikazana cena je za ceo taj termin, bez obzira na broj igrača. Rezervišeš ceo teren za sebe i svoju ekipu.'
      },
      {
        id: 'p4',
        q: 'Da li će platforma uvesti online plaćanje?',
        a: 'Radimo na uvođenju online plaćanja karticom (Visa, Mastercard) u narednim mesecima. Korisnici će biti obavešteni čim opcija bude dostupna.'
      }
    ],
    otkazivanje: [
      {
        id: 'o1',
        q: 'Do kada mogu da otkažem rezervaciju bez posledica?',
        a: 'Otkazivanje je <strong>besplatno ako ga izvršiš više od 24 sata pre termina</strong>. Manje od 24h pre termina, dugme za otkazivanje automatski nestaje i termin se ne može otkazati putem platforme.'
      },
      {
        id: 'o2',
        q: 'Kako da otkažem rezervaciju?',
        a: 'Idi na <strong>Moje rezervacije</strong>, pronađi rezervaciju i klikni "Otkaži". Dobićeš email potvrdu o otkazivanju, a termin postaje slobodan za druge korisnike.'
      },
      {
        id: 'o3',
        q: 'Da li mogu dobiti povrat novca?',
        a: 'Pošto se plaćanje vrši gotovinom na terenu, u standardnom slučaju nema prethodno plaćenog iznosa za vraćanje. Ako si uplatio avans direktno vlasniku terena, povrat dogovaraš sa njim lično — SportskiTermin ne posreduje u novčanim transakcijama.'
      },
      {
        id: 'o4',
        q: 'Šta ako vlasnik otkaže moj termin?',
        a: 'Odmah ćeš dobiti obaveštenje na email. Rezervacija dobija status "Otkazana od vlasnika" i možeš slobodno rezervisati drugi teren ili termin. Preporučujemo da kontaktiraš vlasnika za objašnjenje.'
      },
      {
        id: 'o5',
        q: 'Mogu li prebaciti rezervaciju na drugi termin?',
        a: 'Direktno prebacivanje termina trenutno nije podržano. Otkaži postojeću rezervaciju (više od 24h pre) i kreiraj novu za željeno vreme.'
      }
    ],
    nalog: [
      {
        id: 'n1',
        q: 'Da li je registracija obavezna?',
        a: 'Pregled terena je slobodan bez registracije, ali za rezervaciju moraš imati nalog. Registracija je besplatna i traje manje od 1 minuta.'
      },
      {
        id: 'n2',
        q: 'Zaboravio sam lozinku — šta da radim?',
        a: 'Na stranici za prijavu klikni <strong>"Zaboravili ste lozinku?"</strong>. Unesi email adresu i poslaćemo ti link za resetovanje. Link važi 1 sat.'
      },
      {
        id: 'n3',
        q: 'Kako da promenim email adresu ili lozinku?',
        a: 'Promenu ličnih podataka možeš izvršiti u sekciji <strong>Moj profil</strong> nakon prijave.'
      },
      {
        id: 'n4',
        q: 'Mogu li obrisati nalog?',
        a: 'Da. Zahtev za brisanje naloga pošalji na info&#64;sportskitermin.rs. Nalog sa svim podacima biće obrisan u roku od 7 radnih dana.'
      }
    ],
    ocenjivanje: [
      {
        id: 'oc1',
        q: 'Kada mogu da ostavim recenziju?',
        a: 'Recenziju možeš ostaviti samo za terene koje si zaista koristio — rezervacija mora biti u statusu <strong>"Završeno"</strong>. Ovo osigurava da su sve ocene autentične.'
      },
      {
        id: 'oc2',
        q: 'Mogu li promeniti ili obrisati svoju recenziju?',
        a: 'Trenutno nije moguće menjati objavljenu recenziju. Ako smatraš da je recenzija pogrešna, kontaktiraj nas na info&#64;sportskitermin.rs.'
      },
      {
        id: 'oc3',
        q: 'Da li vlasnik može da odgovori na moju recenziju?',
        a: 'Vlasnici terena imaju mogućnost javnog odgovora na svaku recenziju. Vidljivo je u sekciji komentara na stranici terena.'
      }
    ],
    vlasnici: [
      {
        id: 'v1',
        q: 'Kako da dodam teren na platformu?',
        a: 'Registruj se kao "Vlasnik terena", prijavi se i u vlasničkom panelu klikni <strong>"Dodaj teren"</strong>. Unesi sve detalje, postavi radno vreme, cene i fotografije.'
      },
      {
        id: 'v2',
        q: 'Da li je korišćenje platforme besplatno za vlasnike?',
        a: 'Da, postavljanje i upravljanje terenima na SportskiTermin platformi je <strong>potpuno besplatno</strong>. Ne naplaćujemo mesečnu naknadu niti proviziju.'
      },
      {
        id: 'v3',
        q: 'Kako upravljam rezervacijama?',
        a: 'U vlasničkom panelu vidiš sve predstojeće i prošle rezervacije, statistiku popunjenosti i prihoda. Možeš potvrditi ili otkazati rezervacije i postavljati posebna pravila za određene dane.'
      },
      {
        id: 'v4',
        q: 'Mogu li blokirati određene termine?',
        a: 'Da — u podešavanjima radnog vremena možeš blokirati pojedinačne termine za održavanje, praznike ili privatne događaje.'
      }
    ]
  };
}