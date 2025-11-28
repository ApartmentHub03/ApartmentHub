export const neighborhoodsData = {
    centrum: {
        en: {
            title: "Centrum",
            description: "The historic heart of Amsterdam, where centuries-old architecture meets modern city life, offering an unparalleled urban experience in one of Europe's most beautiful city centers.",
            atmosphere: "Centrum attracts those who want to be in the center of everything - tourists, young professionals, and urbanites who thrive on energy and convenience. Living here means being walking distance from major attractions, restaurants, and nightlife.",
            highlights: [
                "Dam Square and Royal Palace",
                "Red Light District historic area",
                "Historic canal ring (UNESCO World Heritage)",
                "Central Station transportation hub",
                "Countless museums, cafés, and shops"
            ],
            marketData: {
                indicators: [
                    { label: "Rental Growth (4 years)", value: "+12.8%", subtext: "Average growth", trend: "up", color: "yellow" },
                    { label: "Purchase Price Growth (4 years)", value: "+37.8%", subtext: "High growth", trend: "up", color: "yellow" },
                    { label: "Demand Index", value: "10/10", subtext: "Very high demand", trend: "stable", color: "green" },
                    { label: "Availability", value: "1/10", subtext: "Very scarce", trend: "down", color: "red" }
                ],
                rentalPrices: [
                    { name: "Studio", price: 2100 },
                    { name: "1 Bed", price: 2600 },
                    { name: "2 Bed", price: 3500 },
                    { name: "3+ Bed", price: 4500 }
                ],
                purchasePrices: [
                    { name: "Studio", price: 520000 },
                    { name: "1 Bed", price: 610000 },
                    { name: "2 Bed", price: 820000 },
                    { name: "3+ Bed", price: 1080000 }
                ],
                priceTrend: [
                    { year: "2020", rent: 2000, buy: 450000 },
                    { year: "2021", rent: 2100, buy: 500000 },
                    { year: "2022", rent: 2200, buy: 560000 },
                    { year: "2023", rent: 2300, buy: 590000 },
                    { year: "2024", rent: 2400, buy: 620000 }
                ],
                demographics: [
                    { label: "Average Age", value: "29" },
                    { label: "Students", value: "35%" },
                    { label: "Families", value: "20%" },
                    { label: "Professionals", value: "45%" }
                ]
            },
            livability: {
                scores: [
                    { label: "Public Transport", value: "10/10", type: "transport" },
                    { label: "Walkability", value: "10/10", type: "walkability" }
                ],
                amenities: [
                    { label: "Restaurants", count: 120, type: "restaurants" },
                    { label: "Cafés & Bars", count: 65, type: "cafes" },
                    { label: "Schools", count: 4, type: "schools" }
                ]
            }
        },
        nl: {
            title: "Centrum",
            description: "Het historische hart van Amsterdam, waar eeuwenoude architectuur moderne stadsleven ontmoet en een ongeëvenaarde stedelijke ervaring biedt in een van Europa's mooiste stadscentra.",
            atmosphere: "Centrum trekt mensen aan die in het centrum van alles willen zijn - toeristen, jonge professionals en stadsmensen die gedijen op energie en gemak. Hier wonen betekent op loopafstand van belangrijke attracties, restaurants en uitgaansgelegenheden.",
            highlights: [
                "De Dam en het Koninklijk Paleis",
                "Historische Rosse Buurt",
                "Historische grachtengordel (UNESCO Werelderfgoed)",
                "Centraal Station vervoersknooppunt",
                "Talloze musea, cafés en winkels"
            ],
            marketData: {
                indicators: [
                    { label: "Huurgroei (4 jaar)", value: "+12.8%", subtext: "Gemiddelde groei", trend: "up", color: "yellow" },
                    { label: "Koopprijsgroei (4 jaar)", value: "+37.8%", subtext: "Hoge groei", trend: "up", color: "yellow" },
                    { label: "Vraag Index", value: "10/10", subtext: "Zeer hoge vraag", trend: "stable", color: "green" },
                    { label: "Beschikbaarheid", value: "1/10", subtext: "Zeer schaars", trend: "down", color: "red" }
                ],
                rentalPrices: [
                    { name: "Studio", price: 2100 },
                    { name: "1 Slaapkamer", price: 2600 },
                    { name: "2 Slaapkamers", price: 3500 },
                    { name: "3+ Slaapkamers", price: 4500 }
                ],
                purchasePrices: [
                    { name: "Studio", price: 520000 },
                    { name: "1 Slaapkamer", price: 610000 },
                    { name: "2 Slaapkamers", price: 820000 },
                    { name: "3+ Slaapkamers", price: 1080000 }
                ],
                priceTrend: [
                    { year: "2020", rent: 2000, buy: 450000 },
                    { year: "2021", rent: 2100, buy: 500000 },
                    { year: "2022", rent: 2200, buy: 560000 },
                    { year: "2023", rent: 2300, buy: 590000 },
                    { year: "2024", rent: 2400, buy: 620000 }
                ],
                demographics: [
                    { label: "Gemiddelde Leeftijd", value: "29" },
                    { label: "Studenten", value: "35%" },
                    { label: "Gezinnen", value: "20%" },
                    { label: "Professionals", value: "45%" }
                ]
            },
            livability: {
                scores: [
                    { label: "Openbaar Vervoer", value: "10/10", type: "transport" },
                    { label: "Loopvriendelijkheid", value: "10/10", type: "walkability" }
                ],
                amenities: [
                    { label: "Restaurants", count: 120, type: "restaurants" },
                    { label: "Cafés & Bars", count: 65, type: "cafes" },
                    { label: "Scholen", count: 4, type: "schools" }
                ]
            }
        }
    },
    noord: {
        en: {
            title: "Noord",
            description: "Once an industrial area, Noord has transformed into a creative hub with a village-like atmosphere, attracting artists, families, and those seeking more space and affordability.",
            atmosphere: "Popular with creative professionals, young families, and alternative lifestyle seekers. The area offers more space, lower costs, and a strong sense of community. Former industrial buildings have been converted into cultural venues, studios, and unique living spaces.",
            highlights: [
                "NDSM Wharf cultural and creative hub",
                "EYE Film Museum with striking architecture",
                "Large parks and waterfront areas",
                "Alternative cultural venues and festivals",
                "Growing food and nightlife scene"
            ]
        },
        nl: {
            title: "Noord",
            description: "Ooit een industrieel gebied, is Noord getransformeerd tot een creatieve hub met een dorpsachtige sfeer, die kunstenaars, gezinnen en mensen die meer ruimte en betaalbaarheid zoeken aantrekt.",
            atmosphere: "Populair bij creatieve professionals, jonge gezinnen en mensen die een alternatieve levensstijl zoeken. Het gebied biedt meer ruimte, lagere kosten en een sterk gemeenschapsgevoel. Voormalige industriële gebouwen zijn omgebouwd tot culturele locaties, studio's en unieke woonruimtes.",
            highlights: [
                "NDSM-werf culturele en creatieve hub",
                "EYE Filmmuseum met opvallende architectuur",
                "Grote parken en waterrijke gebieden",
                "Alternatieve culturele locaties en festivals",
                "Groeiende eet- en uitgaansscene"
            ]
        }
    },
    jordaan: {
        en: {
            title: "Jordaan",
            description: "Once a working-class area, Jordaan has transformed into one of Amsterdam's most desirable neighborhoods, known for its narrow streets, historic buildings, and artistic heritage.",
            atmosphere: "Home to artists, young professionals, and long-time locals, Jordaan offers an intimate village feel within the city. The area is famous for its art galleries, vintage shops, and some of the best cafés in Amsterdam. The peaceful canals and tree-lined streets create a romantic atmosphere.",
            highlights: [
                "Anne Frank House and museum",
                "Westerkerk church with panoramic city views",
                "Noordermarkt for organic produce and antiques",
                "Historic hofjes (hidden courtyards)",
                "Vibrant art gallery scene"
            ],
            marketData: {
                indicators: [
                    { label: "Rental Growth (4 years)", value: "+13.5%", subtext: "Average growth", trend: "up", color: "yellow" },
                    { label: "Purchase Price Growth (4 years)", value: "+38.1%", subtext: "High growth", trend: "up", color: "yellow" },
                    { label: "Demand Index", value: "10/10", subtext: "Very high demand", trend: "stable", color: "green" },
                    { label: "Availability", value: "2/10", subtext: "Very scarce", trend: "down", color: "red" }
                ],
                rentalPrices: [
                    { name: "Studio", price: 1600 },
                    { name: "1 Bed", price: 2200 },
                    { name: "2 Bed", price: 2800 },
                    { name: "3+ Bed", price: 3500 }
                ],
                purchasePrices: [
                    { name: "Studio", price: 450000 },
                    { name: "1 Bed", price: 550000 },
                    { name: "2 Bed", price: 750000 },
                    { name: "3+ Bed", price: 950000 }
                ],
                priceTrend: [
                    { year: "2020", rent: 1500, buy: 420000 },
                    { year: "2021", rent: 1600, buy: 460000 },
                    { year: "2022", rent: 1800, buy: 510000 },
                    { year: "2023", rent: 2000, buy: 550000 },
                    { year: "2024", rent: 2200, buy: 600000 }
                ],
                demographics: [
                    { label: "Average Age", value: "35" },
                    { label: "Students", value: "15%" },
                    { label: "Families", value: "45%" },
                    { label: "Professionals", value: "40%" }
                ]
            },
            livability: {
                scores: [
                    { label: "Public Transport", value: "8/10", type: "transport" },
                    { label: "Walkability", value: "10/10", type: "walkability" }
                ],
                amenities: [
                    { label: "Restaurants", count: 78, type: "restaurants" },
                    { label: "Cafés & Bars", count: 35, type: "cafes" },
                    { label: "Schools", count: 6, type: "schools" }
                ]
            }
        },
        nl: {
            title: "Jordaan",
            description: "Ooit een arbeiderswijk, is de Jordaan getransformeerd tot een van de meest gewilde buurten van Amsterdam, bekend om zijn smalle straatjes, historische gebouwen en artistieke erfgoed.",
            atmosphere: "Thuisbasis van kunstenaars, jonge professionals en langdurige bewoners, biedt de Jordaan een intiem dorpsgevoel in de stad. Het gebied is beroemd om zijn kunstgalerijen, vintage winkels en enkele van de beste cafés in Amsterdam. De rustige grachten en met bomen omzoomde straten creëren een romantische sfeer.",
            highlights: [
                "Anne Frank Huis en museum",
                "Westerkerk met panoramisch uitzicht over de stad",
                "Noordermarkt voor biologische producten en antiek",
                "Historische hofjes (verborgen binnenplaatsen)",
                "Levendige kunstgaleriescene"
            ],
            marketData: {
                indicators: [
                    { label: "Huurgroei (4 jaar)", value: "+13.5%", subtext: "Gemiddelde groei", trend: "up", color: "yellow" },
                    { label: "Koopprijsgroei (4 jaar)", value: "+38.1%", subtext: "Hoge groei", trend: "up", color: "yellow" },
                    { label: "Vraag Index", value: "10/10", subtext: "Zeer hoge vraag", trend: "stable", color: "green" },
                    { label: "Beschikbaarheid", value: "2/10", subtext: "Zeer schaars", trend: "down", color: "red" }
                ],
                rentalPrices: [
                    { name: "Studio", price: 1600 },
                    { name: "1 Slaapkamer", price: 2200 },
                    { name: "2 Slaapkamers", price: 2800 },
                    { name: "3+ Slaapkamers", price: 3500 }
                ],
                purchasePrices: [
                    { name: "Studio", price: 450000 },
                    { name: "1 Slaapkamer", price: 550000 },
                    { name: "2 Slaapkamers", price: 750000 },
                    { name: "3+ Slaapkamers", price: 950000 }
                ],
                priceTrend: [
                    { year: "2020", rent: 1500, buy: 420000 },
                    { year: "2021", rent: 1600, buy: 460000 },
                    { year: "2022", rent: 1800, buy: 510000 },
                    { year: "2023", rent: 2000, buy: 550000 },
                    { year: "2024", rent: 2200, buy: 600000 }
                ],
                demographics: [
                    { label: "Gemiddelde Leeftijd", value: "35" },
                    { label: "Studenten", value: "15%" },
                    { label: "Gezinnen", value: "45%" },
                    { label: "Professionals", value: "40%" }
                ]
            },
            livability: {
                scores: [
                    { label: "Openbaar Vervoer", value: "8/10", type: "transport" },
                    { label: "Loopvriendelijkheid", value: "10/10", type: "walkability" }
                ],
                amenities: [
                    { label: "Restaurants", count: 78, type: "restaurants" },
                    { label: "Cafés & Bars", count: 35, type: "cafes" },
                    { label: "Scholen", count: 6, type: "schools" }
                ]
            }
        }
    },
    oost: {
        en: {
            title: "Oost",
            description: "Amsterdam East combines residential tranquility with emerging cultural hotspots, offering a perfect balance between urban living and green spaces.",
            atmosphere: "Popular with families and young professionals who want more space and a relaxed atmosphere. The area features beautiful parks, diverse dining options, and a growing arts scene. It's well-connected to the city center while maintaining a peaceful, neighborhood feel.",
            highlights: [
                "Oosterpark - large green recreational area",
                "Tropenmuseum showcasing world cultures",
                "Park Frankendael with historic estate",
                "Diverse international food scene",
                "Growing startup and creative community"
            ]
        },
        nl: {
            title: "Oost",
            description: "Amsterdam Oost combineert residentiële rust met opkomende culturele hotspots en biedt een perfecte balans tussen stedelijk wonen en groene ruimtes.",
            atmosphere: "Populair bij gezinnen en jonge professionals die meer ruimte en een ontspannen sfeer willen. Het gebied beschikt over prachtige parken, diverse eetgelegenheden en een groeiende kunstscene. Het is goed verbonden met het stadscentrum en behoudt tegelijkertijd een rustig buurtgevoel.",
            highlights: [
                "Oosterpark - groot groen recreatiegebied",
                "Tropenmuseum met wereldculturen",
                "Park Frankendael met historisch landgoed",
                "Diverse internationale eetscene",
                "Groeiende startup- en creatieve gemeenschap"
            ]
        }
    },
    zeeburg: {
        en: {
            title: "Zeeburg",
            description: "A water-rich district in East with characteristic architecture and a relaxed atmosphere. The proximity to the IJ and various recreational opportunities make this district attractive for nature lovers.",
            atmosphere: "Zeeburg attracts young families, creative types, and people who love water and nature. The district offers a quiet living environment with good connections to the center.",
            highlights: [
                "Proximity to the IJ with water sports options",
                "Diemerparkbos - Extensive nature",
                "Characteristic architecture",
                "Relaxed atmosphere and greenery",
                "Good accessibility",
                "Diverse cultural facilities"
            ]
        },
        nl: {
            title: "Zeeburg",
            description: "Een waterrijke wijk in Oost met karakteristieke architectuur en een ontspannen sfeer. De nabijheid van het IJ en diverse recreatiemogelijkheden maken deze wijk aantrekkelijk voor natuurliefhebbers.",
            atmosphere: "Zeeburg trekt jonge gezinnen, creatieve types en mensen die houden van water en natuur. De wijk biedt een rustige leefomgeving met goede verbindingen naar het centrum.",
            highlights: [
                "Nabijheid van het IJ met watersportmogelijkheden",
                "Diemerparkbos - Uitgestrekte natuur",
                "Karakteristieke architectuur",
                "Ontspannen sfeer en groen",
                "Goede bereikbaarheid",
                "Diverse culturele voorzieningen"
            ]
        }
    },
    zuidas: {
        en: {
            title: "Zuidas",
            description: "The modern business district of Amsterdam, with impressive high-rise buildings, international companies, and contemporary architecture. This district is the financial and business heart of the capital.",
            atmosphere: "Zuidas mainly attracts business professionals, expats, and people who love modern living. The district offers excellent connections, modern amenities, and an international atmosphere.",
            highlights: [
                "Modern high-rise and architecture",
                "International companies and offices",
                "Station Amsterdam Zuid - Excellent accessibility",
                "Modern restaurants and lunchrooms",
                "Beatrixpark - Greenery near the offices",
                "International schools and facilities"
            ]
        },
        nl: {
            title: "Zuidas",
            description: "Het moderne zakendistrict van Amsterdam, met imposante hoogbouw, internationale bedrijven en hedendaagse architectuur. Dit district is het financiële en zakelijke hart van de hoofdstad.",
            atmosphere: "Zuidas trekt voornamelijk zakelijke professionals, expats en mensen die houden van modern wonen. De wijk biedt uitstekende connecties, moderne voorzieningen en een internationale sfeer.",
            highlights: [
                "Moderne hoogbouw en architectuur",
                "Internationale bedrijven en kantoren",
                "Station Amsterdam Zuid - Uitstekende bereikbaarheid",
                "Moderne restaurants en lunchrooms",
                "Beatrixpark - Groen nabij de kantoren",
                "Internationale scholen en voorzieningen"
            ]
        }
    },
    "de-pijp": {
        en: {
            title: "De Pijp",
            description: "Known as the Latin Quarter of Amsterdam, De Pijp is a vibrant and multicultural neighborhood famous for the Albert Cuyp Market, diverse restaurants, and lively atmosphere.",
            atmosphere: "De Pijp is bustling with energy, attracting students, young professionals, and creatives. It's a food lover's paradise with countless brunch spots, cafes, and international cuisines. The streets are narrow and lively, giving it a cozy, urban village feel.",
            highlights: [
                "Albert Cuyp Market - Europe's largest daily market",
                "Sarphatipark - A beautiful green oasis",
                "Heineken Experience",
                "Gerard Douplein for nightlife and dining",
                "Diverse mix of cultures and cuisines"
            ]
        },
        nl: {
            title: "De Pijp",
            description: "Bekend als het Quartier Latin van Amsterdam, is De Pijp een levendige en multiculturele wijk beroemd om de Albert Cuypmarkt, diverse restaurants en levendige sfeer.",
            atmosphere: "De Pijp bruist van energie en trekt studenten, jonge professionals en creatieven aan. Het is een paradijs voor voedselliefhebbers met talloze brunchplekken, cafés en internationale keukens. De straten zijn smal en levendig, wat het een gezellig, stedelijk dorpsgevoel geeft.",
            highlights: [
                "Albert Cuypmarkt - Europa's grootste dagmarkt",
                "Sarphatipark - Een prachtige groene oase",
                "Heineken Experience",
                "Gerard Douplein voor uitgaan en dineren",
                "Diverse mix van culturen en keukens"
            ]
        }
    },
    "oud-zuid": {
        en: {
            title: "Oud-Zuid",
            description: "One of Amsterdam's most elegant and affluent neighborhoods, known for its luxury shopping, world-class museums, and stately architecture.",
            atmosphere: "Oud-Zuid exudes luxury and sophistication. It attracts families, expats, and professionals who appreciate high-end living. The area is quieter and more spacious than the center, with wide avenues and proximity to Vondelpark.",
            highlights: [
                "Museumplein (Rijksmuseum, Van Gogh Museum)",
                "Vondelpark - Amsterdam's most famous park",
                "P.C. Hooftstraat luxury shopping",
                "Concertgebouw",
                "Elegant 19th-century architecture"
            ]
        },
        nl: {
            title: "Oud-Zuid",
            description: "Een van de meest elegante en welvarende wijken van Amsterdam, bekend om zijn luxe winkels, musea van wereldklasse en statige architectuur.",
            atmosphere: "Oud-Zuid straalt luxe en verfijning uit. Het trekt gezinnen, expats en professionals aan die houden van hoogwaardig wonen. Het gebied is rustiger en ruimer dan het centrum, met brede lanen en nabijheid van het Vondelpark.",
            highlights: [
                "Museumplein (Rijksmuseum, Van Gogh Museum)",
                "Vondelpark - Het beroemdste park van Amsterdam",
                "P.C. Hooftstraat luxe winkelen",
                "Concertgebouw",
                "Elegante 19e-eeuwse architectuur"
            ]
        }
    },
    "nieuw-west": {
        en: {
            title: "Nieuw-West",
            description: "A spacious and green district known for the Sloterplas lake and modern urban planning. It offers affordable living with plenty of recreational opportunities.",
            atmosphere: "Nieuw-West is a multicultural and family-friendly area. It's characterized by space, light, and greenery. The atmosphere is relaxed and diverse, with a mix of post-war architecture and new developments.",
            highlights: [
                "Sloterplas and Sloterpark - Water sports and recreation",
                "Meervaart Theater",
                "Diverse shopping centers (Osdorpplein)",
                "Affordable housing options",
                "Good public transport connections"
            ]
        },
        nl: {
            title: "Nieuw-West",
            description: "Een ruim en groen stadsdeel bekend om de Sloterplas en moderne stedenbouw. Het biedt betaalbaar wonen met volop recreatiemogelijkheden.",
            atmosphere: "Nieuw-West is een multicultureel en gezinsvriendelijk gebied. Het wordt gekenmerkt door ruimte, licht en groen. De sfeer is ontspannen en divers, met een mix van naoorlogse architectuur en nieuwbouw.",
            highlights: [
                "Sloterplas en Sloterpark - Watersport en recreatie",
                "Theater de Meervaart",
                "Diverse winkelcentra (Osdorpplein)",
                "Betaalbare woonopties",
                "Goede openbaar vervoer verbindingen"
            ]
        }
    }
};
