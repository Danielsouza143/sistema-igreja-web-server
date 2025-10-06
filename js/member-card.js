class MemberCard {
    static async getChurchIdentity() {
        // First try localStorage
        const cached = localStorage.getItem('churchIdentity');
        if (cached) {
            return JSON.parse(cached);
        }
        
        // If not in cache, load from server
        return await ChurchIdentity.loadIdentity();
    }

    static async generateCard(memberData) {
        const identity = await this.getChurchIdentity();
        
        return `
            <div class="member-card">
                <img src="${window.api.getImageUrl(identity.logoIgrejaUrl)}" alt="Logo Igreja" class="church-logo">
                <h2>${identity.nomeIgreja}</h2>
                <div class="member-info">
                    <!-- Member card content -->
                    ${memberData.name}
                    <!-- ... other member details ... -->
                </div>
            </div>
        `;
    }
}