const { registerEventRoutes } = require("./event");
const { registerEventRegistrationRoutes } = require("./eventRegistration");
const { registerScheduleRoutes } = require("./schedule");
const { registerDepartmentRoutes } = require("./department");
const { registerEmployeeRoutes } = require("./employee");
const { registerAuthenticationRoutes } = require("./authentication");
const { registerDashboardRoutes } = require("./dashboard");
const { registerPurchaseTicketRoutes} = require("./purchaseTicket");
const { registerQueriesRoutes } = require("./queries");
const { registerReportsRoutes } = require("./reports");
const { registerArtistRoutes } = require("./artist");
const { registerArtworkRoutes } = require("./artwork"); 
const { registerMembershipRoutes } = require("./membership");
const { registerExhibitionRoutes } = require("./exhibition");
const { registerAdmissionRoutes } = require("./admission");
const { registerGiftShopRoutes } = require("./giftShop");
const { registerCafeRoutes } = require("./cafe");
const { registerConservationRoutes } = require("./conservation");
const { registerLoansRoutes } = require("./loans");
const { registerToursRoutes } = require("./tours");


function registerRoutes(app, { pool, upload })
{
    registerEventRegistrationRoutes(app, { pool });
    registerEventRoutes(app, { pool, upload });
    registerDepartmentRoutes(app, { pool });
    registerAuthenticationRoutes(app, { pool });
    registerDashboardRoutes(app, { pool });
    registerPurchaseTicketRoutes(app, { pool });
    registerQueriesRoutes(app, { pool });
    registerReportsRoutes(app, { pool });
    registerArtistRoutes(app, { pool, upload });
    registerArtworkRoutes(app, { pool, upload });
    registerMembershipRoutes(app, { pool });
    registerExhibitionRoutes(app, { pool, upload });
    registerEmployeeRoutes(app, { pool });
    registerAdmissionRoutes(app, { pool });
    registerGiftShopRoutes(app, { pool, upload });
    registerCafeRoutes(app, { pool, upload });
    registerScheduleRoutes(app, { pool });
    registerConservationRoutes(app, { pool });
    registerLoansRoutes(app, { pool, upload });
    registerToursRoutes(app, { pool, upload });
}

module.exports = { registerRoutes };